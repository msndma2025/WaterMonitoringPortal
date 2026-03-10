import { motion } from 'framer-motion';
import { NEWS_TICKER_CONTENT } from '../../config/mapConfig';
import './NewsTicker.css';

const NewsTicker = () => {
  return (
    <div className="news-ticker">
      <motion.div 
        className="news-ticker-content"
        animate={{ x: [0, -2000] }}
        transition={{ 
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: 40,
            ease: 'linear',
          }
        }}
      >
        <span>{NEWS_TICKER_CONTENT}</span>
        <span className="ticker-separator">•</span>
        <span>{NEWS_TICKER_CONTENT}</span>
      </motion.div>
    </div>
  );
};

export default NewsTicker;
