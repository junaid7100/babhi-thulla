import React, { useState } from "react";

export function RoomCodeBadge({ roomCode }: { roomCode: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(roomCode);
    } catch {
      /* clipboard unavailable — the code is still visible on screen */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="font-display text-2xl tracking-[0.3em] font-bold bg-felt-800 border border-white/10 rounded-lg px-4 py-1.5">
        {roomCode}
      </div>
      <button
        type="button"
        onClick={copy}
        className="text-xs font-semibold px-3 py-2 rounded-lg bg-accent hover:bg-accent-dark transition-colors text-white"
      >
        {copied ? "Copied!" : "Copy code"}
      </button>
    </div>
  );
}
