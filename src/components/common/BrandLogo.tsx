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
  variant = "dark",
}) => {
  const iconDimensions = {
    sm: { w: 32, h: 32, box: "w-8 h-8" },
    md: { w: 44, h: 44, box: "w-11 h-11" },
    lg: { w: 56, h: 56, box: "w-14 h-14" },
    xl: { w: 72, h: 72, box: "w-18 h-18" },
  };

  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const currentDim = iconDimensions[size] || iconDimensions.md;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Official Savala Onion Ninja Mascot Badge */}
      <div
        className={`${currentDim.box} relative flex items-center justify-center rounded-2xl bg-white/10 p-1 shadow-sm flex-shrink-0 border border-[#EAAA00]/40 overflow-hidden backdrop-blur-xs`}
      >
        <Image
          src="/logo.png"
          alt="Savala AI Onion Ninja Mascot"
          width={currentDim.w}
          height={currentDim.h}
          className="w-full h-full object-contain filter drop-shadow-sm"
          priority
        />
      </div>

      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight ${
                variant === "dark" ? "text-white" : "text-[#3A0F34]"
              } ${textSizes[size]}`}
            >
              SAVALA
            </span>
            <span className={`font-black text-[#EAAA00] ${textSizes[size]}`}>
              AI
            </span>
          </div>
          <span
            className={`text-[10px] tracking-wider uppercase font-bold ${
              variant === "dark" ? "text-[#DDE3E8]/70" : "text-[#58505C]"
            }`}
          >
            Live Interview Copilot
          </span>
        </div>
      )}
    </div>
  );
};
