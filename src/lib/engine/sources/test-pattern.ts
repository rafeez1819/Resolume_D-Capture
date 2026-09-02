import { formatTimecode } from "@/lib/utils";
import { INK, type DrawFrame, type MediaSource, type SourceKind } from "../types";

const BARS = [
  "#c9c9c9",
  "#c9c90e",
  "#0ec9c9",
  "#0ec90e",
  "#c90ec9",
  "#c90e0e",
  "#0e0ec9",
];

export class TestPatternSource implements MediaSource {
  readonly kind: SourceKind = "test-pattern";
  readonly name = "SMPTE Ident";

  draw({ ctx, width, height, time, fps }: DrawFrame) {
    const barH = Math.round(height * 0.62);
    const n = BARS.length;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = BARS[i]!;
      ctx.fillRect((i * width) / n, 0, width / n + 1, barH);
    }

    const midH = Math.round(height * 0.1);
    const midY = barH;
    const mid = ["#0e0ec9", "#101010", "#c90ec9", "#101010", "#0ec9c9", "#101010", "#c9c9c9"];
    for (let i = 0; i < mid.length; i++) {
      ctx.fillStyle = mid[i]!;
      ctx.fillRect((i * width) / mid.length, midY, width / mid.length + 1, midH);
    }

    const botY = barH + midH;
    const botH = height - botY;
    ctx.fillStyle = "#101010";
    ctx.fillRect(0, botY, width, botH);

    // Pluge
    const plugeW = width * 0.28;
    const shades = ["#050505", "#101010", "#1a1a1a", "#c9c9c9"];
    shades.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(width * 0.06 + (i * plugeW) / 4, botY + botH * 0.18, plugeW / 4 - 2, botH * 0.64);
    });

    const identX = width * 0.38;
    ctx.fillStyle = INK.fg;
    ctx.font = `500 ${Math.max(22, width / 28)}px "IBM Plex Sans"`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("DESKTOP", identX, botY + botH * 0.42);
    ctx.fillStyle = INK.muted;
    ctx.font = `500 ${Math.max(14, width / 48)}px "IBM Plex Sans"`;
    ctx.fillText("CAPTURE", identX, botY + botH * 0.62);

    ctx.fillStyle = INK.live;
    ctx.fillRect(identX, botY + botH * 0.72, 36, 3);

    ctx.fillStyle = INK.fg;
    ctx.font = `400 ${Math.max(12, width / 64)}px "IBM Plex Mono"`;
    ctx.fillText(
      `${width}×${height}   ${fps} FPS   ${formatTimecode(time, fps)}   SPOUT  DesktopCapture   LOCAL LOCK`,
      identX,
      botY + botH * 0.9,
      width - identX - 40,
    );

    const pulse = (Math.sin(time * Math.PI * 2) + 1) / 2;
    const bx = width * 0.9;
    const by = botY + botH * 0.5;
    ctx.beginPath();
    ctx.arc(bx, by, 10 + pulse * 6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(93,186,122,${0.35 + pulse * 0.5})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx, by, 6, 0, Math.PI * 2);
    ctx.fillStyle = INK.live;
    ctx.fill();
  }
}
