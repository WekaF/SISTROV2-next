"use client";
import React from "react";

export const IndonesiaMap = () => {
  // SVG Paths for principal Indonesian Islands (Simplified for UI/UX dashboard view)
  // This allows for individual styling and interaction
  const islands = [
     { id: "sumatra", name: "Sumatra", path: "M43.5 130L20.5 163L43.5 186.5L88 163L111.5 130L88 110L43.5 130Z", status: "Active" },
     { id: "java", name: "Java", path: "M130 186.5H220L220 200H130V186.5Z", status: "High Demand" },
     { id: "kalimantan", name: "Kalimantan", path: "M156 110L130 130V163L156 186.5L200 163V130L178.5 110H156Z", status: "Active" },
     { id: "sulawesi", name: "Sulawesi", path: "M242 110L220 130L242 154L220 171L242 186.5L265 171L287 186.5L309 171L287 154L309 130L287 110H242Z", status: "Warning" },
     { id: "papua", name: "Papua", path: "M356 130L330 163L356 186.5H420L443.5 163L420 130H356Z", status: "Active" },
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <svg 
        viewBox="0 0 460 250" 
        className="w-full h-auto max-h-[350px]"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Graticules / Grid (Optional Style) */}
        
        {/* Islands */}
        <g className="cursor-pointer">
          {islands.map((island) => (
            <path
              key={island.id}
              d={island.path}
              className={`transition-all duration-300 hover:opacity-80
                ${island.status === "Active" ? "fill-brand-500/20 stroke-brand-500" : ""}
                ${island.status === "High Demand" ? "fill-orange-500/20 stroke-orange-500" : ""}
                ${island.status === "Warning" ? "fill-red-500/20 stroke-red-500" : ""}
              `}
              strokeWidth="2"
            >
              <title>{island.name} - {island.status}</title>
            </path>
          ))}
        </g>
        
        {/* Markers for specific plants */}
        <circle cx="178.5" cy="193" r="4" className="fill-brand-500 animate-pulse" />
        <circle cx="210" cy="193" r="4" className="fill-brand-500" />
        <circle cx="38" cy="158" r="4" className="fill-brand-500" />
      </svg>
      
      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-brand-500/20 border border-brand-500" />
          <span className="text-gray-500">Normal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500/20 border border-orange-500" />
          <span className="text-gray-500">High Queue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500" />
          <span className="text-gray-500">Critical</span>
        </div>
      </div>
    </div>
  );
};
