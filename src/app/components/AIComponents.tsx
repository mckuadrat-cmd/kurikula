import { Sparkles } from "lucide-react";
import { HTMLMotionProps, motion } from "motion/react";

interface AICardProps {
  children: React.ReactNode;
  className?: string;
}

export function AICard({ children, className = "" }: AICardProps) {
  return (
    <motion.div
      className={`relative bg-white rounded-[12px] p-6 border border-gray-200 overflow-hidden ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-[#3C405B]/10 via-[#DF7A5E]/10 to-[#F0EAC6]/20 rounded-[12px] blur-xl"
        animate={{
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

interface AIButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
}

export function AIButton({ children, className = "", ...props }: AIButtonProps) {
  return (
    <motion.button
      className={`relative px-6 py-3 bg-gradient-to-r from-[#3C405B] to-[#DF7A5E] text-white rounded-[12px] font-medium overflow-hidden group ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-[#DF7A5E] to-[#3C405B]"
        initial={{ x: "100%" }}
        whileHover={{ x: "0%" }}
        transition={{ duration: 0.3 }}
      />
      <span className="relative z-10 flex items-center gap-2">
        <Sparkles className="w-5 h-5" />
        {children}
      </span>
    </motion.button>
  );
}

interface AIGlowProps {
  children: React.ReactNode;
  className?: string;
}

export function AIGlow({ children, className = "" }: AIGlowProps) {
  return (
    <motion.div
      className={`relative ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute -inset-1 bg-gradient-to-r from-[#3C405B] via-[#DF7A5E] to-[#F0EAC6] rounded-[14px] blur-lg opacity-30"
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}