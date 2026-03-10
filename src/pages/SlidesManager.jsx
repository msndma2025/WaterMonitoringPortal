import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import './SlidesManager.css';

const SlidesManager = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'image',
    url: '',
    file: null
  });

  // Fetch slides
  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    try {
      const response = await fetch('/api/slides');
      if (response.ok) {
        const data = await response.json();
        setSlides(data.sort((a, b) => a.order - b.order));
      }
    } catch (error) {
      console.error('Failed to fetch slides:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      
      if (formData.file) {
        submitData.append('file', formData.file);
      } else if (formData.url) {
        submitData.append('url', formData.url);
        submitData.append('type', formData.type);
      }

      const url = editingSlide 
        ? `/api/slides/${editingSlide.id}` 
        : '/api/slides';
      
      const response = await fetch(url, {
        method: editingSlide ? 'PUT' : 'POST',
        body: submitData
      });

      const data = await response.json();

      if (response.ok) {
        // Check if multiple slides were created (PDF/PPTX extraction)
        if (data.slides && data.slides.length > 1) {
          alert(`Successfully extracted ${data.slides.length} pages from the document!`);
        }
        await fetchSlides();
        resetForm();
      } else {
        // Show error message
        alert(data.error || 'Failed to save slide');
      }
    } catch (error) {
      console.error('Failed to save slide:', error);
      alert('Failed to save slide. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this slide?')) return;

    try {
      const response = await fetch(`/api/slides/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchSlides();
      }
    } catch (error) {
      console.error('Failed to delete slide:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Are you sure you want to delete ALL ${slides.length} slides? This cannot be undone.`)) return;

    try {
      // Delete all slides one by one
      for (const slide of slides) {
        await fetch(`/api/slides/${slide.id}`, { method: 'DELETE' });
      }
      await fetchSlides();
    } catch (error) {
      console.error('Failed to delete all slides:', error);
    }
  };

  const handleEdit = (slide) => {
    setEditingSlide(slide);
    setFormData({
      title: slide.title,
      description: slide.description || '',
      type: slide.type,
      url: slide.url || '',
      file: null
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'image',
      url: '',
      file: null
    });
    setEditingSlide(null);
    setShowAddModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, file, url: '' }));
      
      // Auto-detect type
      if (file.type.startsWith('image/')) {
        setFormData(prev => ({ ...prev, type: 'image' }));
      } else if (file.type.startsWith('video/')) {
        setFormData(prev => ({ ...prev, type: 'video' }));
      } else if (file.type.includes('presentation') || file.type.includes('powerpoint')) {
        setFormData(prev => ({ ...prev, type: 'ppt' }));
      } else if (file.type === 'application/pdf') {
        setFormData(prev => ({ ...prev, type: 'pdf' }));
      }
    }
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSlides = [...slides];
    const draggedSlide = newSlides[draggedIndex];
    newSlides.splice(draggedIndex, 1);
    newSlides.splice(index, 0, draggedSlide);
    
    setSlides(newSlides);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;
    
    try {
      await fetch('/api/slides/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: slides.map(s => s.id) })
      });
    } catch (error) {
      console.error('Failed to reorder slides:', error);
    }
    
    setDraggedIndex(null);
  };

  const getSlidePreview = (slide) => {
    const url = slide.url?.startsWith('/uploads') ? slide.url : slide.url;
    
    if (slide.type === 'video') {
      return (
        <div className="slide-preview video-preview">
          <i className="fas fa-play-circle" />
          <span>Video</span>
        </div>
      );
    }
    if (slide.type === 'ppt') {
      return (
        <div className="slide-preview doc-preview">
          <i className="fas fa-file-powerpoint" />
          <span>PPT</span>
        </div>
      );
    }
    if (slide.type === 'pdf') {
      return (
        <div className="slide-preview doc-preview">
          <i className="fas fa-file-pdf" />
          <span>PDF</span>
        </div>
      );
    }
    return <img src={url} alt={slide.title} />;
  };

  return (
    <div className="slides-manager">
      <header className="manager-header">
        <div className="header-left">
          <Link to="/" className="back-btn">
            <i className="fas fa-arrow-left" />
            Back to Dashboard
          </Link>
          <h1>
            <i className="fas fa-images" />
            Slides Manager
          </h1>
        </div>
        <div className="header-actions">
          {slides.length > 0 && (
            <button className="delete-all-btn" onClick={handleDeleteAll}>
              <i className="fas fa-trash-alt" />
              Delete All ({slides.length})
            </button>
          )}
          <button className="add-btn" onClick={() => setShowAddModal(true)}>
            <i className="fas fa-plus" />
            Add Slide
          </button>
        </div>
      </header>

      <div className="manager-content">
        {loading ? (
          <div className="loading-state">
            <i className="fas fa-spinner fa-spin" />
            Loading slides...
          </div>
        ) : slides.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-images" />
            <h3>No slides yet</h3>
            <p>Add your first slide to get started</p>
            <button onClick={() => setShowAddModal(true)}>
              <i className="fas fa-plus" /> Add Slide
            </button>
          </div>
        ) : (
          <div className="slides-grid">
            {slides.map((slide, index) => (
              <motion.div
                key={slide.id}
                className={`slide-card ${draggedIndex === index ? 'dragging' : ''}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="slide-preview-container">
                  {getSlidePreview(slide)}
                  <div className="slide-overlay">
                    <span className="slide-type">{slide.type}</span>
                    {slide.pageNumber && (
                      <span className="page-number">Page {slide.pageNumber}/{slide.totalPages}</span>
                    )}
                  </div>
                </div>
                <div className="slide-info">
                  <h4>{slide.title}</h4>
                  {slide.description && <p>{slide.description}</p>}
                  {slide.originalName && slide.pageNumber && (
                    <small className="original-file">From: {slide.originalName}</small>
                  )}
                </div>
                <div className="slide-actions">
                  <button className="edit-btn" onClick={() => handleEdit(slide)}>
                    <i className="fas fa-edit" />
                  </button>
                  <button className="delete-btn" onClick={() => handleDelete(slide.id)}>
                    <i className="fas fa-trash" />
                  </button>
                  <span className="drag-handle">
                    <i className="fas fa-grip-vertical" />
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetForm}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>
                  <i className={`fas fa-${editingSlide ? 'edit' : 'plus'}`} />
                  {editingSlide ? 'Edit Slide' : 'Add New Slide'}
                </h2>
                <button className="close-btn" onClick={resetForm}>
                  <i className="fas fa-times" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter slide title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter description (optional)"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Upload File</label>
                  <div className="file-upload">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*,video/*,.ppt,.pptx,.pdf"
                    />
                    <div className="file-upload-placeholder">
                      <i className="fas fa-cloud-upload-alt" />
                      <span>{formData.file ? formData.file.name : 'Click to upload or drag and drop'}</span>
                      <small>Images, Videos, PPT, PDF (max 500MB)</small>
                    </div>
                  </div>
                </div>

                <div className="form-divider">
                  <span>OR</span>
                </div>

                <div className="form-group">
                  <label>External URL</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value, file: null }))}
                    placeholder="https://example.com/image.jpg"
                    disabled={!!formData.file}
                  />
                </div>

                {formData.url && !formData.file && (
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="ppt">PowerPoint</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={resetForm}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn" disabled={uploading}>
                    {uploading ? (
                      <>
                        <i className="fas fa-spinner fa-spin" />
                        {editingSlide ? 'Updating...' : 'Uploading...'}
                      </>
                    ) : (
                      <>
                        <i className={`fas fa-${editingSlide ? 'save' : 'plus'}`} />
                        {editingSlide ? 'Update Slide' : 'Add Slide'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SlidesManager;
