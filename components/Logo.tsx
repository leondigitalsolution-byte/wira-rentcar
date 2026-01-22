import React from 'react';

export const Logo = ({ className = "h-12 w-auto", src }: { className?: string, src?: string | null }) => (
  <div className={className}>
    {src ? (
      <img src={src} alt="App Logo" className="w-full h-full object-contain" />
    ) : (
      <svg viewBox="0 0 130 55" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* B */}
          <path d="M5 5 H 35 Q 50 5 50 22 Q 50 38 35 38 H 15 V 50 H 5 V 5 Z" fill="black" />
          <path d="M15 15 V 30 H 30 Q 38 30 38 22 Q 38 15 30 15 H 15 Z" fill="white" />
          
          {/* R */}
          <path d="M40 5 H 65 Q 80 5 80 22 Q 80 32 70 36 L 85 50 H 70 L 58 38 H 50 V 50 H 40 V 5 Z" fill="black" />
          <path d="M50 15 V 30 H 60 Q 68 30 68 22 Q 68 15 60 15 H 50 Z" fill="white" />

          {/* C (Steering Wheel Style) */}
          <path d="M115 27.5 A 22.5 22.5 0 1 0 115 28" stroke="black" strokeWidth="10" strokeLinecap="round" fill="none" transform="translate(-25, 0)"/>
          
          {/* Red Dot Center */}
          <circle cx="90" cy="27.5" r="5" fill="#DC2626" /> 
      </svg>
    )}
  </div>
);

export const LogoText = ({ title }: { title?: string }) => {
  // Split title roughly or display as is
  const displayTitle = title || "BERSAMA RENT CAR";
  
  return (
    <div className="flex flex-col justify-center leading-none select-none">
         <div className="flex items-end">
          <span className="text-xl font-black text-slate-900 tracking-tighter uppercase truncate max-w-[160px]" style={{fontFamily: 'Arial, sans-serif'}}>
            {displayTitle}
          </span>
         </div>
         {/* Optional subtitle or part of logo styling */}
         <span className="text-[9px] font-bold text-red-600 tracking-[0.2em] uppercase">MANAGEMENT</span>
    </div>
  );
};