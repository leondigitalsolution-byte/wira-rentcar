import React from 'react';

export const Logo = ({ className = "h-12 w-auto", src }: { className?: string, src?: string | null }) => (
  <div className={className}>
    {/* Menggunakan tag <img> menggantikan <svg>.
      src="/logo-tab.png" akan mengambil gambar dari folder public/root.
    */}
    <img 
      src={src || "/logo-tab.png"} 
      alt="App Logo" 
      className="w-full h-full object-contain" 
    />
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
          <span className="text-[9px] font-bold text-slate-500 tracking-[0.2em] uppercase">MANAGEMENT</span>
    </div>
  );
};
