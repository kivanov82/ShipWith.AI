'use client';

import { motion } from 'framer-motion';

interface SpeechBubbleProps {
  content: string;
  agentColor: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  isThinking?: boolean;
}

export function SpeechBubble({ content, agentColor, position, isThinking = false }: SpeechBubbleProps) {
  const bgColor = isThinking ? 'bg-amber-500' : 'bg-[#141418]';
  const textColor = isThinking ? 'text-amber-950' : 'text-zinc-300';
  const borderColor = isThinking ? 'border-amber-400' : 'border-zinc-700/60';

  const tailStyles = {
    top: `bottom-[-6px] left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent ${isThinking ? 'border-t-amber-500' : 'border-t-[#141418]'}`,
    bottom: `top-[-6px] left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent ${isThinking ? 'border-b-amber-500' : 'border-b-[#141418]'}`,
    left: `right-[-6px] top-1/2 -translate-y-1/2 border-t-[6px] border-b-[6px] border-l-[6px] border-t-transparent border-b-transparent ${isThinking ? 'border-l-amber-500' : 'border-l-[#141418]'}`,
    right: `left-[-6px] top-1/2 -translate-y-1/2 border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent ${isThinking ? 'border-r-amber-500' : 'border-r-[#141418]'}`,
  };

  return (
    <motion.div
      className="relative max-w-[150px]"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={`relative ${bgColor} rounded-xl px-2.5 py-2 border ${borderColor} shadow-xl shadow-black/20`}
      >
        {/* Accent line */}
        {!isThinking && (
          <div
            className="absolute top-0 left-3 right-3 h-[2px] rounded-full opacity-60"
            style={{ backgroundColor: agentColor }}
          />
        )}

        {/* Thinking indicator */}
        {isThinking && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-amber-600"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}

        <p className={`text-[9px] ${textColor} leading-relaxed font-medium`}>
          {content.length > 50 ? content.slice(0, 50) + '...' : content}
        </p>

        {/* Tail */}
        <div className={`absolute w-0 h-0 ${tailStyles[position]}`} />
      </div>
    </motion.div>
  );
}

export function getBubblePosition(angle: number): 'top' | 'bottom' | 'left' | 'right' {
  const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const degrees = (normalizedAngle * 180) / Math.PI;

  if (degrees >= 315 || degrees < 45) {
    return 'right';
  } else if (degrees >= 45 && degrees < 135) {
    return 'bottom';
  } else if (degrees >= 135 && degrees < 225) {
    return 'left';
  } else {
    return 'top';
  }
}
