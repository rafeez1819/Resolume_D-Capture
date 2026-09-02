import { formatTimecode } from "@/lib/utils";
import { drawWinChrome } from "../draw-chrome";
import { fillRoundRect, wrapText } from "../fit";
import { INK, type DrawFrame, type MediaSource, type SourceKind } from "../types";

export type AppDescriptor = {
  id: string;
  title: string;
  process: string;
  detail: string;
};

export const RUNNING_APPS: AppDescriptor[] = [
  { id: "chrome", title: "Microsoft Edge", process: "msedge.exe", detail: "file:///C:/Shows/Tonight/index.html" },
  { id: "powerpoint", title: "PowerPoint", process: "POWERPNT.EXE", detail: "Venue Intro.pptx" },
  { id: "acrobat", title: "Adobe Acrobat", process: "Acrobat.exe", detail: "Stage Plot.pdf" },
  { id: "vlc", title: "VLC media player", process: "vlc.exe", detail: "Loop_A.mp4" },
  { id: "photoshop", title: "Adobe Photoshop", process: "Photoshop.exe", detail: "Backdrop.psd" },
  { id: "explorer", title: "File Explorer", process: "explorer.exe", detail: "C:\\Shows\\Tonight" },
  { id: "notepad", title: "Notepad", process: "notepad.exe", detail: "rundown.txt" },
  { id: "aftereffects", title: "Adobe After Effects", process: "AfterFX.exe", detail: "Comp 1" },
];

export class ApplicationSource implements MediaSource {
  readonly kind: SourceKind = "application";
  readonly name: string;
  page = 1;
  pageCount = 4;

  constructor(private app: AppDescriptor) {
    this.name = `${app.title} — ${app.detail}`;
  }

  nextPage() {
    this.page = Math.min(this.pageCount, this.page + 1);
  }

  prevPage() {
    this.page = Math.max(1, this.page - 1);
  }

  draw(frame: DrawFrame) {
    const { ctx, width, height, minimized } = frame;
    const box = drawWinChrome(ctx, 0, 0, width, height, this.app.title, minimized);
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    switch (this.app.id) {
      case "chrome":
        drawBrowser(ctx, box, frame);
        break;
      case "powerpoint":
        drawDeck(ctx, box, frame, this.page, this.pageCount);
        break;
      case "acrobat":
        drawAcrobat(ctx, box, frame, this.page, this.pageCount);
        break;
      case "vlc":
        drawVlc(ctx, box, frame);
        break;
      case "photoshop":
        drawPhotoshop(ctx, box, frame);
        break;
      case "explorer":
        drawExplorer(ctx, box, frame);
        break;
      case "notepad":
        drawNotepad(ctx, box, frame);
        break;
      default:
        drawAfterEffects(ctx, box, frame);
        break;
    }
    ctx.restore();
  }
}

export class DesktopSource implements MediaSource {
  readonly kind: SourceKind = "desktop";
  readonly name = "Desktop";

  draw(frame: DrawFrame) {
    const { ctx, width, height, time, fps, minimized } = frame;
    ctx.fillStyle = "#101218";
    ctx.fillRect(0, 0, width, height);
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, "#12151c");
    g.addColorStop(1, "#0b0c10");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // Quiet geometric wallpaper
    ctx.strokeStyle = "rgba(197,204,214,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(width * 0.72, height * 0.38, 80 + i * 48, 0, Math.PI * 2);
      ctx.stroke();
    }

    const icons = ["Shows", "Media", "Resolume", "Capture", "Output"];
    icons.forEach((label, i) => {
      const ix = 48;
      const iy = 48 + i * 92;
      fillRoundRect(ctx, ix, iy, 44, 44, 8, "#1c1d22");
      ctx.fillStyle = INK.accent;
      ctx.fillRect(ix + 10, iy + 10, 24, 3);
      ctx.fillStyle = INK.muted;
      ctx.font = `400 ${Math.max(11, width / 96)}px "IBM Plex Sans"`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(label, ix + 56, iy + 14);
    });

    if (!minimized) {
      const wx = width * 0.28;
      const wy = height * 0.16;
      const ww = width * 0.54;
      const wh = height * 0.58;
      drawWinChrome(ctx, wx, wy, ww, wh, "Desktop Capture — Program", false);
      ctx.fillStyle = "#0a0a0b";
      ctx.fillRect(wx, wy + 32, ww, wh - 32);
      ctx.fillStyle = INK.fg;
      ctx.font = `500 ${Math.max(18, ww / 18)}px "IBM Plex Sans"`;
      ctx.textAlign = "left";
      ctx.fillText("LOCAL PIPELINE", wx + 28, wy + 80);
      ctx.fillStyle = INK.muted;
      ctx.font = `400 ${Math.max(13, ww / 32)}px "IBM Plex Sans"`;
      ctx.fillText("Window → texture → Spout → Arena", wx + 28, wy + 118);
      ctx.fillStyle = INK.live;
      ctx.fillRect(wx + 28, wy + 140, 32, 3);
    }

    const task = Math.max(36, height * 0.05);
    ctx.fillStyle = "rgba(18,18,20,0.92)";
    ctx.fillRect(0, height - task, width, task);
    fillRoundRect(ctx, 12, height - task + 6, 28, task - 12, 4, "#2a2a30");
    ctx.fillStyle = INK.muted;
    ctx.font = `400 ${Math.max(11, width / 90)}px "IBM Plex Mono"`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatTimecode(time, fps).slice(0, 8), width - 20, height - task / 2);
    ctx.textAlign = "left";
    ctx.fillText("Desktop Capture", 52, height - task / 2);
  }
}

export class DemoDeckSource implements MediaSource {
  readonly kind: SourceKind = "powerpoint";
  readonly name: string;
  page = 1;
  pageCount = DECK.length;

  constructor(name = "Venue Intro.pptx") {
    this.name = name;
  }

  nextPage() {
    this.page = Math.min(this.pageCount, this.page + 1);
  }
  prevPage() {
    this.page = Math.max(1, this.page - 1);
  }

  draw(frame: DrawFrame) {
    const { ctx, width, height, minimized } = frame;
    const box = drawWinChrome(ctx, 0, 0, width, height, `PowerPoint  —  ${this.name}`, minimized);
    drawDeck(ctx, box, frame, this.page, this.pageCount);
  }
}

type Box = { x: number; y: number; w: number; h: number };

const DECK = [
  { kicker: "TONIGHT", title: "Main Stage", body: "Local files route through Desktop Capture into Resolume Arena. No network. No NDI hop." },
  { kicker: "PIPELINE", title: "Spout lock", body: "GPU texture leaves this window as sender DesktopCapture. Arena takes it as a live source." },
  { kicker: "OUTPUT", title: "Match the wall", body: "Set resolution and FPS to the composition. 1080p60, UHD, portrait LED, triple-wide." },
  { kicker: "CAPTURE", title: "Any program", body: "Edge, PowerPoint, Acrobat, VLC, Photoshop — or a real window from this PC." },
];

function drawDeck(
  ctx: CanvasRenderingContext2D,
  box: Box,
  frame: DrawFrame,
  page: number,
  count: number,
) {
  const slide = DECK[(page - 1) % DECK.length]!;
  ctx.fillStyle = "#141416";
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const pad = 8;
  ctx.fillStyle = "#101012";
  ctx.fillRect(box.x + pad, box.y + pad, box.w - pad * 2, box.h - pad * 2 - 28);
  const x = box.x + 48;
  const y = box.y + box.h * 0.22;
  ctx.fillStyle = INK.live;
  ctx.font = `500 ${Math.max(12, box.w / 48)}px "IBM Plex Mono"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(slide.kicker, x, y);
  ctx.fillStyle = INK.fg;
  ctx.font = `500 ${Math.max(32, box.w / 14)}px "IBM Plex Sans"`;
  ctx.fillText(slide.title, x, y + 36);
  ctx.fillStyle = INK.muted;
  ctx.font = `400 ${Math.max(16, box.w / 28)}px "IBM Plex Sans"`;
  wrapText(ctx, slide.body, box.w - 96)
    .slice(0, 4)
    .forEach((line, i) => ctx.fillText(line, x, y + 110 + i * 28, box.w - 96));
  ctx.fillStyle = INK.subtle;
  ctx.font = `400 ${Math.max(11, box.w / 60)}px "IBM Plex Mono"`;
  ctx.textAlign = "center";
  ctx.fillText(`SLIDE ${page} / ${count}   ·   LOCAL`, box.x + box.w / 2, box.y + box.h - 16);
  void frame;
}

function drawBrowser(ctx: CanvasRenderingContext2D, box: Box, frame: DrawFrame) {
  const tabH = Math.max(34, box.h * 0.06);
  ctx.fillStyle = "#1b1b1f";
  ctx.fillRect(box.x, box.y, box.w, tabH);
  fillRoundRect(ctx, box.x + 10, box.y + 6, 180, tabH - 6, 6, INK.elevated);
  ctx.fillStyle = INK.fg;
  ctx.font = `500 ${Math.max(11, box.w / 70)}px "IBM Plex Sans"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Tonight", box.x + 24, box.y + tabH / 2 + 2);
  const urlH = Math.max(30, box.h * 0.05);
  ctx.fillStyle = "#121214";
  ctx.fillRect(box.x, box.y + tabH, box.w, urlH);
  fillRoundRect(ctx, box.x + 16, box.y + tabH + 5, box.w - 32, urlH - 10, (urlH - 10) / 2, "#1c1c20");
  ctx.fillStyle = INK.subtle;
  ctx.font = `400 ${Math.max(11, box.w / 80)}px "IBM Plex Mono"`;
  ctx.fillText("file:///C:/Shows/Tonight/index.html", box.x + 28, box.y + tabH + urlH / 2);

  const cx = box.x;
  const cy = box.y + tabH + urlH;
  const cw = box.w;
  const ch = box.h - tabH - urlH;
  ctx.fillStyle = "#0e0e10";
  ctx.fillRect(cx, cy, cw, ch);
  ctx.fillStyle = INK.subtle;
  ctx.font = `500 ${Math.max(12, cw / 48)}px "IBM Plex Mono"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("LOCAL  ·  OFFLINE", cx + 48, cy + 40);
  ctx.fillStyle = INK.fg;
  ctx.font = `500 ${Math.max(36, cw / 12)}px "IBM Plex Sans"`;
  ctx.fillText("Hall A", cx + 48, cy + 72);
  ctx.fillStyle = INK.muted;
  ctx.font = `400 ${Math.max(16, cw / 28)}px "IBM Plex Sans"`;
  ctx.fillText("Doors 19:30   ·   Show 20:15   ·   Local playback", cx + 48, cy + 132);

  const t = frame.time;
  const remain = 20 * 60 - Math.floor(t);
  const mm = Math.max(0, Math.floor(remain / 60));
  const ss = Math.max(0, remain % 60);
  ctx.fillStyle = INK.accent;
  ctx.font = `500 ${Math.max(28, cw / 16)}px "IBM Plex Mono"`;
  ctx.fillText(`${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`, cx + 48, cy + 180);

  for (let i = 0; i < 3; i++) {
    const gx = cx + 48 + i * (cw * 0.22);
    fillRoundRect(ctx, gx, cy + ch * 0.58, cw * 0.18, ch * 0.28, 8, "#16161a");
    ctx.fillStyle = INK.subtle;
    ctx.font = `400 ${Math.max(12, cw / 50)}px "IBM Plex Sans"`;
    ctx.fillText(["Look A", "Look B", "Look C"][i]!, gx + 16, cy + ch * 0.58 + 20);
    ctx.fillStyle = i === Math.floor(t) % 3 ? INK.live : INK.border;
    ctx.fillRect(gx + 16, cy + ch * 0.58 + ch * 0.2, 28, 3);
  }
}

function drawAcrobat(
  ctx: CanvasRenderingContext2D,
  box: Box,
  frame: DrawFrame,
  page: number,
  count: number,
) {
  ctx.fillStyle = "#2a2a2e";
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const pageW = box.w * 0.62;
  const pageH = box.h * 0.82;
  const px = box.x + (box.w - pageW) / 2;
  const py = box.y + box.h * 0.06;
  ctx.fillStyle = "#f3f2ee";
  ctx.fillRect(px, py, pageW, pageH);
  ctx.fillStyle = "#1a1a1a";
  ctx.font = `600 ${Math.max(16, pageW / 18)}px "IBM Plex Sans"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("Stage Plot", px + 28, py + 28);
  ctx.fillStyle = "#4a4a4a";
  ctx.font = `400 ${Math.max(12, pageW / 28)}px "IBM Plex Sans"`;
  ctx.fillText("Local rider  ·  Hall A  ·  Page " + page, px + 28, py + 64);

  ctx.strokeStyle = "#b9b6ae";
  ctx.strokeRect(px + 28, py + 100, pageW - 56, pageH * 0.55);
  const seats = 5;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < seats; c++) {
      ctx.fillStyle = r === 0 && c === 2 ? "#5dba7a" : "#d8d4cc";
      ctx.fillRect(px + 48 + c * ((pageW - 96) / seats), py + 120 + r * 36, 28, 18);
    }
  }
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(px + pageW / 2 - 40, py + 100 + pageH * 0.42, 80, 14);
  ctx.fillStyle = "#6b6b73";
  ctx.font = `400 ${Math.max(11, pageW / 32)}px "IBM Plex Mono"`;
  ctx.fillText(`PAGE ${page} / ${count}`, px + 28, py + pageH - 32);
  void frame;
}

function drawVlc(ctx: CanvasRenderingContext2D, box: Box, frame: DrawFrame) {
  ctx.fillStyle = "#0c0c0e";
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const t = frame.time;
  ctx.save();
  ctx.translate(box.x + box.w / 2, box.y + box.h * 0.42);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2 + t;
    const r = 40 + Math.sin(t * 2 + i) * 28 + i * 1.2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r * 0.55, 2, 0, Math.PI * 2);
    ctx.fillStyle = i % 8 === 0 ? INK.live : INK.accent;
    ctx.globalAlpha = 0.35 + (i % 8) / 16;
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(10,10,11,0.86)";
  ctx.fillRect(box.x, box.y + box.h - 54, box.w, 54);
  ctx.fillStyle = INK.fg;
  ctx.font = `500 ${Math.max(12, box.w / 50)}px "IBM Plex Sans"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Loop_A.mp4", box.x + 20, box.y + box.h - 34);
  ctx.fillStyle = INK.subtle;
  ctx.font = `400 ${Math.max(11, box.w / 60)}px "IBM Plex Mono"`;
  ctx.fillText(formatTimecode(t, frame.fps), box.x + 20, box.y + box.h - 16);
  ctx.fillStyle = INK.live;
  ctx.fillRect(box.x + 140, box.y + box.h - 18, Math.min(box.w - 180, (t % 12) / 12 * (box.w - 180)), 3);
}

function drawPhotoshop(ctx: CanvasRenderingContext2D, box: Box, frame: DrawFrame) {
  ctx.fillStyle = "#2c2c30";
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const rail = 44;
  ctx.fillStyle = "#1e1e22";
  ctx.fillRect(box.x, box.y, rail, box.h);
  ctx.fillRect(box.x + box.w - 140, box.y, 140, box.h);
  const cx = box.x + rail + 16;
  const cy = box.y + 16;
  const cw = box.w - rail - 140 - 32;
  const ch = box.h - 32;
  ctx.fillStyle = "#0e0e10";
  ctx.fillRect(cx, cy, cw, ch);
  const imgG = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
  imgG.addColorStop(0, "#1c2430");
  imgG.addColorStop(1, "#0b1016");
  ctx.fillStyle = imgG;
  ctx.fillRect(cx + 24, cy + 24, cw - 48, ch - 48);
  ctx.strokeStyle = INK.live;
  ctx.setLineDash([6, 4]);
  const pulse = 80 + Math.sin(frame.time * 2) * 8;
  ctx.beginPath();
  ctx.arc(cx + cw * 0.5, cy + ch * 0.48, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = INK.muted;
  ctx.font = `400 ${Math.max(11, box.w / 70)}px "IBM Plex Sans"`;
  ctx.textAlign = "left";
  ctx.fillText("Layers", box.x + box.w - 124, box.y + 28);
  ["Backdrop", "Light", "Logo"].forEach((l, i) => {
    ctx.fillStyle = i === 1 ? INK.fg : INK.muted;
    ctx.fillText(l, box.x + box.w - 124, box.y + 56 + i * 22);
  });
}

function drawExplorer(ctx: CanvasRenderingContext2D, box: Box, frame: DrawFrame) {
  ctx.fillStyle = "#1a1a1e";
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = "#121214";
  ctx.fillRect(box.x, box.y, box.w, 36);
  ctx.fillStyle = INK.muted;
  ctx.font = `400 ${Math.max(12, box.w / 60)}px "IBM Plex Mono"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("C:\\Shows\\Tonight", box.x + 16, box.y + 18);
  const files = [
    "Venue Intro.pptx",
    "Stage Plot.pdf",
    "Loop_A.mp4",
    "Backdrop.png",
    "index.html",
    "rundown.txt",
  ];
  files.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const fx = box.x + 32 + col * (box.w / 3.2);
    const fy = box.y + 64 + row * 110;
    fillRoundRect(ctx, fx, fy, 72, 56, 6, "#242428");
    ctx.fillStyle = INK.fg;
    ctx.font = `400 ${Math.max(12, box.w / 55)}px "IBM Plex Sans"`;
    ctx.textBaseline = "top";
    ctx.fillText(f, fx, fy + 66, box.w / 3.4);
  });
  void frame;
}

function drawNotepad(ctx: CanvasRenderingContext2D, box: Box, frame: DrawFrame) {
  ctx.fillStyle = "#1c1c18";
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const lines = [
    "HALL A RUNDOWN",
    "",
    "19:00  doors / house",
    "19:30  walk-in look",
    "20:10  ident",
    "20:15  show",
    "21:40  encore",
    "22:00  walk-out",
    "",
    "Sources stay local. No Wi-Fi. No Bluetooth.",
  ];
  ctx.font = `400 ${Math.max(14, box.w / 42)}px "IBM Plex Mono"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? INK.fg : INK.muted;
    ctx.fillText(line, box.x + 28, box.y + 24 + i * Math.max(22, box.h / 18));
  });
  void frame;
}

function drawAfterEffects(ctx: CanvasRenderingContext2D, box: Box, frame: DrawFrame) {
  ctx.fillStyle = "#1b1b1f";
  ctx.fillRect(box.x, box.y, box.w, box.h);
  const viewerH = box.h * 0.62;
  ctx.fillStyle = "#0c0c0e";
  ctx.fillRect(box.x + 8, box.y + 8, box.w - 16, viewerH);
  const t = frame.time;
  ctx.save();
  ctx.translate(box.x + box.w / 2, box.y + 8 + viewerH / 2);
  ctx.rotate(t * 0.15);
  ctx.strokeStyle = INK.accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(-80, -48, 160, 96);
  ctx.restore();
  ctx.fillStyle = INK.fg;
  ctx.font = `500 ${Math.max(14, box.w / 40)}px "IBM Plex Sans"`;
  ctx.textAlign = "center";
  ctx.fillText("Comp 1", box.x + box.w / 2, box.y + 8 + viewerH / 2 - 8);
  ctx.fillStyle = "#141416";
  ctx.fillRect(box.x, box.y + viewerH + 12, box.w, box.h - viewerH - 12);
  ctx.fillStyle = INK.live;
  ctx.fillRect(box.x + 16 + ((t * 40) % (box.w - 40)), box.y + viewerH + 20, 2, box.h - viewerH - 28);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i === 1 ? "#2a2a32" : "#1e1e24";
    ctx.fillRect(box.x + 16, box.y + viewerH + 24 + i * 18, box.w - 32, 14);
  }
}
