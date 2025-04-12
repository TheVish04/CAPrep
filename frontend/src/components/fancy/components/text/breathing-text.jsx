import * as React from "react";
import { motion, useAnimationControls } from "framer-motion";

const BreathingText = ({
  label,
  fromFontVariationSettings,
  toFontVariationSettings,
  className = "",
  transition = { type: "spring", duration: 0.7 },
  staggerDuration = 0.03,
  staggerFrom = "center",
  onClick,
  ...props
}) => {
  const letters = label.split("");
  const controls = letters.map(() => useAnimationControls());
  const [isAnimating, setIsAnimating] = React.useState(true);

  React.useEffect(() => {
    const centerIndex = Math.floor(letters.length / 2);
    
    const animate = async () => {
      if (!isAnimating) return;
      
      // Sequence 1: Animate to target
      for (let i = 0; i < letters.length; i++) {
        const letterIndex = (() => {
          if (staggerFrom === "first") return i;
          if (staggerFrom === "last") return letters.length - 1 - i;
          
          // From center
          const distance = Math.abs(i - centerIndex);
          if (i <= centerIndex) return centerIndex - distance;
          return centerIndex + (i - centerIndex);
        })();
        
        const delay = staggerDuration * i;
        controls[letterIndex].start({
          fontVariationSettings: toFontVariationSettings,
          transition: { ...transition, delay }
        });
      }
      
      // Delay between sequences
      await new Promise(resolve => setTimeout(resolve, transition.duration * 1000 + letters.length * staggerDuration * 1000 + 500));
      
      // Sequence 2: Animate back to original
      for (let i = 0; i < letters.length; i++) {
        const letterIndex = (() => {
          if (staggerFrom === "first") return i;
          if (staggerFrom === "last") return letters.length - 1 - i;
          
          // From center
          const distance = Math.abs(i - centerIndex);
          if (i <= centerIndex) return centerIndex - distance;
          return centerIndex + (i - centerIndex);
        })();
        
        const delay = staggerDuration * i;
        controls[letterIndex].start({
          fontVariationSettings: fromFontVariationSettings,
          transition: { ...transition, delay }
        });
      }
      
      // Delay before repeating
      await new Promise(resolve => setTimeout(resolve, transition.duration * 1000 + letters.length * staggerDuration * 1000 + 500));
      
      // Continue animation loop
      if (isAnimating) {
        animate();
      }
    };
    
    animate();
    
    return () => setIsAnimating(false);
  }, [controls, letters, fromFontVariationSettings, toFontVariationSettings, staggerDuration, staggerFrom, transition, isAnimating]);
  
  return (
    <div className={`inline-flex ${className}`} onClick={onClick} {...props}>
      {letters.map((letter, i) => (
        <motion.span
          key={`${letter}-${i}`}
          initial={{ fontVariationSettings: fromFontVariationSettings }}
          animate={controls[i]}
          style={{ 
            display: "inline-block", 
            fontVariationSettings: fromFontVariationSettings 
          }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </div>
  );
};

export default BreathingText; 