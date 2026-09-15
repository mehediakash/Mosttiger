import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


const videoData = [
  'https://www.youtube.com/embed/6jRxxgRq6i8',
  'https://www.youtube.com/embed/3HmL91l_PHw',
];


const VideoSlider = () => {
  const [current, setCurrent] = useState(0);
  const timeoutRef = useRef(null);

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % videoData.length);
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + videoData.length) % videoData.length);
  };

  const goToSlide = (index) => {
    setCurrent(index);
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-8 relative">
      {/* Slider */}
      <div className="overflow-hidden rounded-xl shadow-lg relative">
        <AnimatePresence initial={false}>
          <motion.div

            className="w-full h-64 sm:h-80 md:h-96"
          >
            <iframe
              src={videoData[current]}
              title={`video-${current}`}
              className="w-full h-full"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Arrows */}
      <button
        onClick={prevSlide}
        className="absolute top-1/2 -translate-y-1/2 left-2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition"
      >
        ‹
      </button>
      <button
        onClick={nextSlide}
        className="absolute top-1/2 -translate-y-1/2 right-2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition"
      >
        ›
      </button>

      {/* Dots */}
      <div className="flex justify-center mt-4 space-x-2">
        {videoData.map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full transition ${
              index === current ? 'bg-blue-500' : 'bg-gray-300'
            }`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoSlider;
