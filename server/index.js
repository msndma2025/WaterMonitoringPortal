import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PDF to image conversion using pdftoppm (poppler-utils)
async function convertPdfToImages(pdfPath, outputDir, baseName) {
  const pages = [];
  
  try {
    // Get number of pages first
    const { stdout: pageCountOutput } = await execAsync(`pdfinfo "${pdfPath}" | grep Pages | awk '{print $2}'`);
    const pageCount = parseInt(pageCountOutput.trim()) || 1;
    
    // Convert each page to PNG using pdftoppm with high DPI for better text quality
    await execAsync(`pdftoppm -png -r 300 "${pdfPath}" "${path.join(outputDir, baseName)}"`);
    
    // Find generated files
    for (let i = 1; i <= pageCount; i++) {
      const paddedNum = i.toString().padStart(pageCount.toString().length, '0');
      // pdftoppm creates files like basename-1.png, basename-01.png depending on page count
      let possibleNames = [
        `${baseName}-${i}.png`,
        `${baseName}-${paddedNum}.png`
      ];
      
      for (const fileName of possibleNames) {
        const filePath = path.join(outputDir, fileName);
        if (fs.existsSync(filePath)) {
          pages.push({
            pageNumber: i,
            fileName: fileName,
            filePath: filePath
          });
          break;
        }
      }
    }
    
    return pages;
  } catch (error) {
    console.error('PDF conversion error:', error);
    throw new Error('Failed to convert PDF. Make sure poppler-utils is installed (brew install poppler on macOS)');
  }
}

// Convert PPTX to PDF using LibreOffice, then extract pages
async function convertPptxToImages(pptxPath, outputDir, baseName) {
  try {
    // Check if LibreOffice is available
    try {
      await execAsync('which soffice');
    } catch {
      throw new Error('PPTX conversion requires LibreOffice. Install it with: brew install --cask libreoffice');
    }
    
    // First convert PPTX to PDF using LibreOffice
    const pdfOutputDir = outputDir;
    await execAsync(`soffice --headless --convert-to pdf --outdir "${pdfOutputDir}" "${pptxPath}"`);
    
    // Find the generated PDF
    const pptxBaseName = path.basename(pptxPath, path.extname(pptxPath));
    const pdfPath = path.join(pdfOutputDir, `${pptxBaseName}.pdf`);
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error('PPTX to PDF conversion failed');
    }
    
    // Now convert PDF pages to images
    const pages = await convertPdfToImages(pdfPath, outputDir, baseName);
    
    // Clean up the intermediate PDF
    fs.unlinkSync(pdfPath);
    
    return pages;
  } catch (error) {
    console.error('PPTX conversion error:', error);
    throw error;
  }
}

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Listen on all network interfaces

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

/* ─────────────────────────────────────────────────────────────
   Google location search (Places API New) via service account.
   The service account key stays on the server and is never sent
   to the browser. The frontend calls /api/search?q=... (proxied).
   ───────────────────────────────────────────────────────────── */
const SA_PATH =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '..', 'locationsearch-495818-20ef8870e102.json');

let _serviceAccount = null;
function loadServiceAccount() {
  if (_serviceAccount) return _serviceAccount;
  _serviceAccount = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
  return _serviceAccount;
}

let _tokenCache = { token: null, exp: 0 };
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_tokenCache.token && _tokenCache.exp - 60 > now) return _tokenCache.token;

  const sa = loadServiceAccount();
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64(header)}.${b64(claim)}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const jwt = `${unsigned}.${signature}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('OAuth token error: ' + JSON.stringify(data));
  _tokenCache = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return _tokenCache.token;
}

// As-you-type suggestions via Places Autocomplete (New)
app.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: [] });
  try {
    const sa = loadServiceAccount();
    const token = await getAccessToken();
    const resp = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Goog-User-Project': sa.project_id,
      },
      body: JSON.stringify({
        input: q,
        includedRegionCodes: ['pk'],
      }),
    });
    const data = await resp.json();
    if (data.error) {
      console.error('Autocomplete error:', data.error);
      return res.status(502).json({ error: data.error.message || 'Autocomplete error', results: [] });
    }
    const results = (data.suggestions || [])
      .map((s) => s.placePrediction)
      .filter(Boolean)
      .map((p) => ({
        placeId: p.placeId,
        name: p.structuredFormat?.mainText?.text || p.text?.text || 'Location',
        address: p.structuredFormat?.secondaryText?.text || '',
      }));
    res.json({ results });
  } catch (e) {
    console.error('Search failed:', e.message);
    res.status(500).json({ error: e.message, results: [] });
  }
});

// Resolve a selected suggestion to coordinates via Place Details (New)
app.get('/place/:id', async (req, res) => {
  try {
    const sa = loadServiceAccount();
    const token = await getAccessToken();
    const resp = await fetch(
      'https://places.googleapis.com/v1/places/' + encodeURIComponent(req.params.id),
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Goog-User-Project': sa.project_id,
          'X-Goog-FieldMask': 'location,displayName,formattedAddress',
        },
      }
    );
    const data = await resp.json();
    if (data.error) {
      console.error('Place details error:', data.error);
      return res.status(502).json({ error: data.error.message });
    }
    res.json({
      name: data.displayName?.text || '',
      address: data.formattedAddress || '',
      lat: data.location?.latitude,
      lng: data.location?.longitude,
    });
  } catch (e) {
    console.error('Place details failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Slides data file
const slidesDataPath = path.join(__dirname, 'slides.json');

// Initialize slides data if not exists
if (!fs.existsSync(slidesDataPath)) {
  fs.writeFileSync(slidesDataPath, JSON.stringify([], null, 2));
}

// Helper functions
const getSlides = () => {
  const data = fs.readFileSync(slidesDataPath, 'utf-8');
  return JSON.parse(data);
};

const saveSlides = (slides) => {
  fs.writeFileSync(slidesDataPath, JSON.stringify(slides, null, 2));
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Videos
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    // PPT/Documents
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/pdf'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: images, videos, PPT, PDF'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Routes

// GET /slides - Get all slides
app.get('/slides', (req, res) => {
  try {
    const slides = getSlides();
    res.json(slides);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch slides' });
  }
});

// GET /slides/:id - Get single slide
app.get('/slides/:id', (req, res) => {
  try {
    const slides = getSlides();
    const slide = slides.find(s => s.id === req.params.id);
    if (!slide) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    res.json(slide);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch slide' });
  }
});

// POST /slides - Create new slide (with file upload)
app.post('/slides', upload.single('file'), async (req, res) => {
  try {
    const slides = getSlides();
    const { title, description, type } = req.body;
    
    let fileUrl = req.body.url || null; // For external URLs (like YouTube)
    let fileType = type || 'image';
    
    if (req.file) {
      const mimetype = req.file.mimetype;
      const isPdf = mimetype === 'application/pdf';
      const isPptx = mimetype.includes('presentation') || mimetype.includes('powerpoint');
      
      // Handle PDF and PPTX - extract pages as individual slides
      if (isPdf || isPptx) {
        const filePath = path.join(uploadsDir, req.file.filename);
        const baseName = `doc_${Date.now()}`;
        
        try {
          let pages;
          const originalName = req.file.originalname;
          
          if (isPdf) {
            pages = await convertPdfToImages(filePath, uploadsDir, baseName);
          } else {
            pages = await convertPptxToImages(filePath, uploadsDir, baseName);
          }
          
          if (pages.length === 0) {
            throw new Error('No pages extracted from document');
          }
          
          // Create a slide for each page
          const newSlides = pages.map((page, index) => ({
            id: `${Date.now()}_${index}`,
            title: `${title || originalName} - Page ${page.pageNumber}`,
            description: description || `Page ${page.pageNumber} of ${pages.length}`,
            type: 'image',
            url: `/uploads/${page.fileName}`,
            originalName: originalName,
            pageNumber: page.pageNumber,
            totalPages: pages.length,
            groupId: baseName, // Group identifier for all pages from same document
            createdAt: new Date().toISOString(),
            order: slides.length + index
          }));
          
          slides.push(...newSlides);
          saveSlides(slides);
          
          // Delete the original PDF/PPTX file
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          
          res.status(201).json({ 
            message: `Successfully extracted ${pages.length} pages`,
            slides: newSlides 
          });
          return;
        } catch (conversionError) {
          console.error('Document conversion error:', conversionError);
          // Clean up uploaded file
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          return res.status(500).json({ 
            error: conversionError.message || 'Failed to extract pages from document'
          });
        }
      }
      
      // Regular file upload (images, videos)
      fileUrl = `/uploads/${req.file.filename}`;
      // Determine type from mimetype
      if (req.file.mimetype.startsWith('image/')) {
        fileType = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        fileType = 'video';
      }
    }
    
    const newSlide = {
      id: Date.now().toString(),
      title: title || 'Untitled',
      description: description || '',
      type: fileType,
      url: fileUrl,
      originalName: req.file?.originalname || null,
      createdAt: new Date().toISOString(),
      order: slides.length
    };
    
    slides.push(newSlide);
    saveSlides(slides);
    
    res.status(201).json(newSlide);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create slide' });
  }
});

// PUT /slides/:id - Update slide
app.put('/slides/:id', upload.single('file'), (req, res) => {
  try {
    const slides = getSlides();
    const index = slides.findIndex(s => s.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    
    const { title, description, order, url } = req.body;
    
    // Update fields
    if (title !== undefined) slides[index].title = title;
    if (description !== undefined) slides[index].description = description;
    if (order !== undefined) slides[index].order = parseInt(order);
    if (url !== undefined) slides[index].url = url;
    
    // Handle new file upload
    if (req.file) {
      // Delete old file if exists
      if (slides[index].url && slides[index].url.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, slides[index].url);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      slides[index].url = `/uploads/${req.file.filename}`;
      slides[index].originalName = req.file.originalname;
      
      // Update type based on new file
      if (req.file.mimetype.startsWith('image/')) {
        slides[index].type = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        slides[index].type = 'video';
      } else if (req.file.mimetype.includes('presentation') || req.file.mimetype.includes('powerpoint')) {
        slides[index].type = 'ppt';
      } else if (req.file.mimetype === 'application/pdf') {
        slides[index].type = 'pdf';
      }
    }
    
    slides[index].updatedAt = new Date().toISOString();
    saveSlides(slides);
    
    res.json(slides[index]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update slide' });
  }
});

// DELETE /slides/:id - Delete slide
app.delete('/slides/:id', (req, res) => {
  try {
    const slides = getSlides();
    const index = slides.findIndex(s => s.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    
    // Delete associated file
    if (slides[index].url && slides[index].url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, slides[index].url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    slides.splice(index, 1);
    saveSlides(slides);
    
    res.json({ message: 'Slide deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete slide' });
  }
});

// PUT /slides/reorder - Reorder slides
app.put('/slides/reorder', (req, res) => {
  try {
    const { orderedIds } = req.body;
    const slides = getSlides();
    
    orderedIds.forEach((id, index) => {
      const slide = slides.find(s => s.id === id);
      if (slide) {
        slide.order = index;
      }
    });
    
    saveSlides(slides);
    res.json({ message: 'Slides reordered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder slides' });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Slides API available at http://localhost:${PORT}/slides`);
  console.log(`Network accessible on port ${PORT}`);
});
