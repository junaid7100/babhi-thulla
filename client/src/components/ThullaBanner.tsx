import React from "react";
import { SUIT_NAMES, ThullaInfo } from "../types";

export function ThullaBanner({ info }: { info: ThullaInfo }) {
  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-x-0 top-20 z-50 flex justify-center px-4 pointer-events-none"
    >
      <div className="animate-thulla-shake bg-gradient-to-r from-red-700 to-red-600 text-white rounded-xl shadow-card-lifted px-5 py-3 text-center max-w-xs">
        <div className="font-display font-bold text-xl tracking-wide">THULLA!</div>
        <div className="text-sm mt-0.5">
          {info.offenderName} had no {SUIT_NAMES[info.missingSuit]}
        </div>
        <div className="text-sm">
          {info.winnerName} takes {info.pileSize} card{info.pileSize === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}
