import { INK } from "./types";
import { fillRoundRect } from "./fit";

export type ContentBox = { x: number; y: number; w: number; h: number };

export function drawWinChrome(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  minimized: boolean,
): ContentBox {
  if (minimized) return { x, y, w, h };

  const bar = Math.max(28, Math.round(h * 0.045));
  fillRoundRect(ctx, x, y, w, h, 8, INK.elevated);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, bar);
  ctx.clip();
  ctx.fillStyle = "#161618";
  ctx.fillRect(x, y, w, bar);
  ctx.restore();

  ctx.fillStyle = INK.fg;
  ctx.font = `500 ${Math.max(11, Math.round(bar * 0.42))}px "IBM Plex Sans"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(title, x + 14, y + bar / 2, w - 120);

  const btnW = Math.max(36, Math.round(w * 0.04));
  const glyphs = ["—", "□", "×"] as const;
  glyphs.forEach((g, i) => {
    const bx = x + w - btnW * (3 - i);
    ctx.fillStyle = i === 2 ? "rgba(212,84,74,0.0)" : "transparent";
    ctx.fillRect(bx, y, btnW, bar);
    ctx.fillStyle = i === 2 ? INK.muted : INK.subtle;
    ctx.font = `400 ${Math.max(11, Math.round(bar * 0.4))}px "IBM Plex Sans"`;
    ctx.textAlign = "center";
    ctx.fillText(g, bx + btnW / 2, y + bar / 2 + 0.5);
  });

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + bar);
  ctx.lineTo(x + w, y + bar);
  ctx.stroke();

  return { x, y: y + bar, w, h: h - bar };
}

export function drawIdentCard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  title: string,
  lines: string[],
) {
  ctx.fillStyle = INK.bg;
  ctx.fillRect(0, 0, width, height);

  const pad = Math.round(Math.min(width, height) * 0.08);
  ctx.fillStyle = INK.subtle;
  ctx.font = `500 ${Math.max(12, width / 64)}px "IBM Plex Mono"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("DESKTOP CAPTURE", pad, pad);

  ctx.fillStyle = INK.fg;
  ctx.font = `500 ${Math.max(28, width / 18)}px "IBM Plex Sans"`;
  ctx.fillText(title, pad, pad + Math.max(36, height / 12), width - pad * 2);

  ctx.fillStyle = INK.muted;
  ctx.font = `400 ${Math.max(14, width / 42)}px "IBM Plex Sans"`;
  lines.forEach((line, i) => {
    ctx.fillText(
      line,
      pad,
      pad + Math.max(36, height / 12) + Math.max(48, height / 10) + i * Math.max(24, height / 22),
      width - pad * 2,
    );
  });

  ctx.fillStyle = INK.live;
  ctx.fillRect(pad, height - pad - 3, 48, 3);
}
