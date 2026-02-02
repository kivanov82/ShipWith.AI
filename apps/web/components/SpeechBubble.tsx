'use client';

import { motion } from 'framer-motion';

interface SpeechBubbleProps {
  content: string;
  agentColor: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  isThinking?: boolean;
}

export function SpeechBubble({ content, agentColor, position, isThinking = false }: SpeechBubbleProps) {
  // Bright colors for thinking state
  const bgColor = isThinking ? 'bg-yellow-500' : 'bg-zinc-800';
  const textColor = isThinking ? 'text-yellow-950' : 'text-zinc-300';
  const borderColor = isThinking ? 'border-yellow-400' : 'border-zinc-700';

  const tailStyles = {
    top: `bottom-[-6px] left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent ${isThinking ? 'border-t-yellow-500' : 'border-t-zinc-800'}`,
    bottom: `top-[-6px] left-1/2 -translate-x-1/2 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent ${isThinking ? 'border-b-yellow-500' : 'border-b-zinc-800'}`,
    left: `right-[-6px] top-1/2 -translate-y-1/2 border-t-[6px] border-b-[6px] border-l-[6px] border-t-transparent border-b-transparent ${isThinking ? 'border-l-yellow-500' : 'border-l-zinc-800'}`,
    right: `left-[-6px] top-1/2 -translate-y-1/2 border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent ${isThinking ? 'border-r-yellow-500' : 'border-r-zinc-800'}`,
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
        className={`relative ${bgColor} rounded-lg px-2 py-1.5 border ${borderColor} shadow-lg`}
      >
        {/* Accent line */}
        {!isThinking && (
          <div
            className="absolute top-0 left-2 right-2 h-0.5 rounded-full"
            style={{ backgroundColor: agentColor }}
          />
        )}

        {/* Thinking indicator */}
        {isThinking && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-yellow-600"
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
