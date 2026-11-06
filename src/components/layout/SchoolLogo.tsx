import React from 'react';

interface SchoolLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  lightText?: boolean;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  lightText = false,
}) => {
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-xs', sub: 'text-[9px]' },
    md: { icon: 'w-9 h-9', text: 'text-sm', sub: 'text-[10px]' },
    lg: { icon: 'w-12 h-12', text: 'text-base', sub: 'text-xs' },
    xl: { icon: 'w-16 h-16', text: 'text-xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official School Crest / Emblem with Navy, Purple & Cyan accents */}
      <div
        className={`${currentSize.icon} relative shrink-0 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-0.5 shadow-md shadow-indigo-950/40 border border-cyan-400/30 flex items-center justify-center`}
      >
        <div className="w-full h-full rounded-[14px] bg-slate-950/90 flex items-center justify-center relative overflow-hidden">
          {/* Subtle cyan glow inside crest */}
          <div className="absolute inset-0 bg-radial from-cyan-500/20 via-transparent to-transparent pointer-events-none" />
          
          {/* Stylized SFE Crest SVG */}
          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-4/5 h-4/5 text-white"
          >
            {/* Laurel leaves on crest perimeter */}
            <path
              d="M8 26C7 20 9 14 14 10C12 15 13 21 16 25"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M32 26C33 20 31 14 26 10C28 15 27 21 24 25"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Academic Cap / Shield Core */}
            <path
              d="M20 9L31 14L20 19L9 14L20 9Z"
              fill="#818cf8"
              stroke="#e0e7ff"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path
              d="M13 16.5V23C13 27 20 29.5 20 29.5C20 29.5 27 27 27 23V16.5"
              stroke="#c084fc"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Star of Excellence */}
            <path
              d="M20 21L21 23L23 23.5L21.5 25L22 27L20 26L18 27L18.5 25L17 23.5L19 23L20 21Z"
              fill="#38bdf8"
            />
          </svg>
        </div>
      </div>

      <div>
        <div
          className={`font-black tracking-tight leading-none uppercase ${currentSize.text} ${
            lightText ? 'text-white' : 'text-slate-900 dark:text-white'
          }`}
        >
          School for Excellence
        </div>
        {showSubtitle && (
          <div
            className={`font-semibold tracking-wider uppercase mt-1 flex items-center gap-1.5 ${currentSize.sub} ${
              lightText ? 'text-indigo-200' : 'text-indigo-600 dark:text-cyan-400'
            }`}
          >
            <span>Secondary School</span>
            <span className="text-slate-400 font-normal">·</span>
            <span className="text-slate-400 font-mono">Grades 9–12</span>
          </div>
        )}
      </div>
    </div>
  );
};
