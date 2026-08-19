import { useEffect, useState } from "react";

/** Ctrl+Shift+F anywhere reveals a small "Built by 🦊" card. Click to close. */
export function FoxSignature() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 grid place-items-center bg-background/60 backdrop-blur-sm"
    >
      <div className="fox-pop flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4 shadow-2xl">
        <span className="fox-wiggle text-2xl">🦊</span>
        <span className="text-sm font-medium tracking-wide text-foreground">Built by 🦊</span>
      </div>
    </div>
  );
}
