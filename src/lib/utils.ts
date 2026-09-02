import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimecode(seconds: number, fps: number) {
  const safeFps = Math.max(1, Math.round(fps));
  const totalFrames = Math.max(0, Math.floor(seconds * safeFps));
  const f = totalFrames % safeFps;
  const totalSecs = Math.floor(totalFrames / safeFps);
  const s = totalSecs % 60;
  const m = Math.floor(totalSecs / 60) % 60;
  const h = Math.floor(totalSecs / 3600);
  const pad = (n: number, w = 2) => n.toString().padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function waitFonts() {
  if (typeof document === "undefined") return Promise.resolve();
  return document.fonts.ready.catch(() => undefined);
}
