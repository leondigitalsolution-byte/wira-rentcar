
import React from 'react';

export const Logo = ({ className = "h-12 w-auto", src }: { className?: string, src?: string | null }) => (
  <div className={className}>
    {/* Menggunakan src dari props (database) atau fallback ke logo.png */}
    <img 
      src={src || "logo.png"} 
      alt="Wira Rent Car Logo" 
      className="w-full h-full object-contain"
      onError={(e) => {
        // Jika file lokal juga hilang, tampilkan icon mobil standar sebagai pengaman terakhir
        const target = e.target as HTMLImageElement;
        if (target.src.indexOf('logo.png') === -1) {
            target.src = "logo.png";
        }
      }}
    />
  </div>
);

export const LogoText = ({ title }: { title?: string }) => {
  const displayTitle = title || "WIRA RENT CAR";
  
  return (
    <div className="flex flex-col justify-center leading-none select-none">
         <div className="flex items-end">
          <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase truncate max-w-[160px]" style={{fontFamily: 'Inter, sans-serif'}}>
            {displayTitle}
          </span>
         </div>
         <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase">MANAGEMENT</span>
    </div>
  );
};
