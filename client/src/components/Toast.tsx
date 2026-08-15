import React from "react";

export function Toast({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warning" | "success" }) {
  const toneClasses =
    tone === "warning" ? "bg-amber-600/90" : tone === "success" ? "bg-emerald-600/90" : "bg-felt-700/95 border border-white/10";
  return (
    <div role="status" className={`text-xs sm:text-sm text-white rounded-full px-3 py-1.5 shadow-card ${toneClasses}`}>
      {children}
    </div>
  );
}

export function ToastStack({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed top-3 inset-x-0 z-40 flex flex-col items-center gap-1.5 pointer-events-none px-4">
      {children}
    </div>
  );
}
