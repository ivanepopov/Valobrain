import type {ReactNode} from 'react';

interface GlassBoxProps {
  children: ReactNode;
  className?: string;
}

export function GlassBox({ children, className = '' }: GlassBoxProps) {
  return (
    <div 
      className={`
        backdrop-blur-md bg-white/5 
        border border-white/10 
        rounded-xl p-6
        transition-all duration-300
        hover:border-[#7f5af0]
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default GlassBox;
