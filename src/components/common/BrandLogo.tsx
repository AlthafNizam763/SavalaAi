import React from "react";
import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  collapsed?: boolean;
  variant?: "dark" | "light"; // "dark" = on Deep Aubergine sidebar, "light" = on light canvas
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = "",
  size = "md",
  collapsed = false,
}) => {
  const iconDimensions = {
    sm: { w: 28, h: 28, box: "w-8 h-8" },
    md: { w: 36, h: 36, box: "w-10 h-10" },
    lg: { w: 48, h: 48, box: "w-12 h-12" },
    xl: { w: 64, h: 64, box: "w-16 h-16" },
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl",
  };

  const currentDim = iconDimensions[size] || iconDimensions.md;

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Official Savala Mascot Badge in Glass */}
      <div
        className={`${currentDim.box} relative flex items-center justify-center rounded-xl bg-white/[0.06] p-1 shadow-xs flex-shrink-0 border border-white/10 overflow-hidden backdrop-blur-md`}
      >
        <Image
          src="/logo.png"
          alt="Savala AI Mascot"
          width={currentDim.w}
          height={currentDim.h}
          className="w-full h-full object-contain filter drop-shadow-xs"
          priority
        />
      </div>

      {!collapsed && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-white ${textSizes[size]}`}>
              SAVALA
            </span>
            <span className={`font-black text-[#A3A3A3] ${textSizes[size]}`}>
              AI
            </span>
          </div>
          <span className="text-[9px] tracking-wider uppercase font-semibold text-[#737373] mt-1">
            Interview Copilot
          </span>
        </div>
      )}
    </div>
  );
};
