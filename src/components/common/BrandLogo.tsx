import React from "react";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  collapsed?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = "",
  size = "md",
  collapsed = false,
}) => {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Brand SVG Mark: Audio wave + Diamond spark + Code brackets in Deep Aubergine & Marigold */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl bg-[#3A0F34] text-[#EAAA00] shadow-sm flex-shrink-0 border border-[#EAAA00]/30`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5/6 h-5/6 p-0.5"
          aria-hidden="true"
        >
          {/* Subtle acoustic soundwave bars */}
          <rect x="4" y="12" width="2.5" height="8" rx="1.25" fill="#DDE3E8" opacity="0.8" />
          <rect x="8.5" y="8" width="2.5" height="16" rx="1.25" fill="#EAAA00" />
          <rect x="13" y="11" width="2.5" height="10" rx="1.25" fill="#DDE3E8" opacity="0.8" />

          {/* Central AI Diamond Spark */}
          <path
            d="M21 6L23 11.5L28.5 13.5L23 15.5L21 21L19 15.5L13.5 13.5L19 11.5L21 6Z"
            fill="#EAAA00"
          />

          {/* Code bracket anchor */}
          <path
            d="M23 20L26 23L23 26"
            stroke="#DDE3E8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19 26L16 23L19 20"
            stroke="#DDE3E8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-bold tracking-tight text-[#3A0F34] ${textSizes[size]}`}>
              SAVALA
            </span>
            <span className={`font-extrabold text-[#EAAA00] ${textSizes[size]}`}>
              AI
            </span>
          </div>
          <span className="text-[10px] tracking-wider uppercase font-semibold text-[#58505C]">
            Interview Workspace
          </span>
        </div>
      )}
    </div>
  );
};
