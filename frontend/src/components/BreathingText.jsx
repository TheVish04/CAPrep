import React, { useState, useEffect } from 'react';
import './BreathingText.css';

/**
 * BreathingText component - Creates a text with breathing animation effect using
 * variable font variation settings.
 *
 * @param {Object} props
 * @param {string} props.text - The text to animate
 * @param {string} props.fromFontVariationSettings - Initial font variation settings
 * @param {string} props.toFontVariationSettings - Target font variation settings
 * @param {number} props.duration - Animation duration in seconds
 * @param {number} props.staggerDuration - Delay between each letter's animation
 * @param {string} props.className - Additional CSS classes
 */
const BreathingText = ({
  text,
  fromFontVariationSettings = "'wght' 100, 'slnt' 0",
  toFontVariationSettings = "'wght' 700, 'slnt' -10",
  duration = 3,
  staggerDuration = 0.05,
  className = ""
}) => {
  // Split text into an array of letters
  const letters = text.split('');
  
  return (
    <div className={`breathing-text-container ${className}`}>
      {letters.map((letter, index) => (
        <span
          key={index}
          className="breathing-letter"
          style={{
            '--from-settings': fromFontVariationSettings,
            '--to-settings': toFontVariationSettings,
            '--animation-duration': `${duration}s`,
            '--animation-delay': `${index * staggerDuration}s`
          }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </span>
      ))}
    </div>
  );
};

export default BreathingText; 