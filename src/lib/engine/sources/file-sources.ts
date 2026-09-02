import { formatBytes } from "@/lib/utils";
import { drawIdentCard, drawWinChrome } from "../draw-chrome";
import { fitRect, loadImageFromUrl, wrapText } from "../fit";
import { INK, type DrawFrame, type FitMode, type MediaSource, type SourceKind } from "../types";

function paintFitted(
  ctx: CanvasRenderingContext2D,
  bmp: CanvasImageSource,
  sw: number,
  sh: number,
  width: number,
  height: number,
  fit: FitMode,
) {
  const r = fitRect(sw, sh, width, height, fit);
  ctx.fillStyle = INK.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bmp, r.x, r.y, r.w, r.h);
}

export class ImageSource implements MediaSource {
  readonly kind: SourceKind = "image";
  readonly name: string;
  private img: HTMLImageElement | null = null;
  private url: string | null = null;
  fit: FitMode = "contain";

  constructor(private file: File) {
    this.name = file.name;
  }

  async init() {
    this.url = URL.createObjectURL(this.file);
    this.img = await loadImageFromUrl(this.url);
  }

  dispose() {
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
    this.img = null;
  }

  draw({ ctx, width, height, fit }: DrawFrame) {
    if (!this.img) {
      drawIdentCard(ctx, width, height, "Image", ["Loading…"]);
      return;
    }
    paintFitted(ctx, this.img, this.img.naturalWidth, this.img.naturalHeight, width, height, fit);
  }
}

export class VideoFileSource implements MediaSource {
  readonly kind: SourceKind = "video";
  readonly name: string;
  private video: HTMLVideoElement | null = null;
  private url: string | null = null;
  fit: FitMode = "contain";

  constructor(private file: File) {
    this.name = file.name;
  }

  async init() {
    this.url = URL.createObjectURL(this.file);
    const video = document.createElement("video");
    video.src = this.url;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    await video.play().catch(() => undefined);
    this.video = video;
  }

  dispose() {
    this.video?.pause();
    this.video?.removeAttribute("src");
    this.video?.load();
    this.video = null;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
  }

  draw({ ctx, width, height, fit }: DrawFrame) {
    const v = this.video;
    if (!v || v.readyState < 2) {
      drawIdentCard(ctx, width, height, "Video", [this.name, "Decoding local media…"]);
      return;
    }
    paintFitted(ctx, v, v.videoWidth || 16, v.videoHeight || 9, width, height, fit);
  }
}

export class CaptureSource implements MediaSource {
  readonly kind: SourceKind;
  readonly name: string;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  fit: FitMode = "contain";
  onEnded?: () => void;

  constructor(kind: SourceKind, name: string) {
    this.kind = kind;
    this.name = name;
  }

  async init() {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 60 },
      audio: false,
    });
    this.stream = stream;
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    this.video = video;
    stream.getVideoTracks()[0]?.addEventListener("ended", () => this.onEnded?.());
  }

  dispose() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video = null;
  }

  draw({ ctx, width, height, fit }: DrawFrame) {
    const v = this.video;
    if (!v || v.readyState < 2) {
      drawIdentCard(ctx, width, height, this.name, ["Waiting for window capture…"]);
      return;
    }
    paintFitted(ctx, v, v.videoWidth || 16, v.videoHeight || 9, width, height, fit);
  }
}

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<{
    getViewport: (opts: { scale: number }) => { width: number; height: number };
    render: (opts: {
      canvasContext: CanvasRenderingContext2D;
      canvas: HTMLCanvasElement;
      viewport: { width: number; height: number };
    }) => { promise: Promise<void> };
  }>;
};

export class PdfSource implements MediaSource {
  readonly kind: SourceKind = "pdf";
  readonly name: string;
  page = 1;
  pageCount = 1;
  private doc: PdfDoc | null = null;
  private pageCanvas: HTMLCanvasElement | null = null;
  private rendering = false;
  private renderedPage = 0;
  fit: FitMode = "contain";

  constructor(private data: ArrayBuffer, name: string) {
    this.name = name;
  }

  async init() {
    const pdfjs = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const doc = await pdfjs.getDocument({ data: this.data }).promise;
    this.doc = doc as unknown as PdfDoc;
    this.pageCount = doc.numPages;
    this.page = 1;
    await this.renderPage();
  }

  dispose() {
    this.doc = null;
    this.pageCanvas = null;
  }

  nextPage() {
    if (this.page < this.pageCount) {
      this.page += 1;
      void this.renderPage();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page -= 1;
      void this.renderPage();
    }
  }

  private async renderPage() {
    if (!this.doc || this.rendering) return;
    this.rendering = true;
    const target = this.page;
    try {
      const pg = await this.doc.getPage(target);
      const viewport = pg.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await pg.render({ canvasContext: ctx, canvas, viewport }).promise;
      this.pageCanvas = canvas;
      this.renderedPage = target;
    } finally {
      this.rendering = false;
      if (this.page !== this.renderedPage) void this.renderPage();
    }
  }

  draw({ ctx, width, height, minimized, fit }: DrawFrame) {
    const box = drawWinChrome(ctx, 0, 0, width, height, this.name, minimized);
    ctx.fillStyle = "#1c1c1c";
    ctx.fillRect(box.x, box.y, box.w, box.h);
    if (!this.pageCanvas) {
      ctx.fillStyle = INK.muted;
      ctx.font = `400 ${Math.max(14, width / 48)}px "IBM Plex Sans"`;
      ctx.textAlign = "center";
      ctx.fillText("Rendering local PDF…", box.x + box.w / 2, box.y + box.h / 2);
      return;
    }
    const r = fitRect(
      this.pageCanvas.width,
      this.pageCanvas.height,
      box.w - 24,
      box.h - 48,
      fit,
    );
    ctx.drawImage(this.pageCanvas, box.x + 12 + r.x, box.y + 12 + r.y, r.w, r.h);
    ctx.fillStyle = INK.muted;
    ctx.font = `400 ${Math.max(11, width / 90)}px "IBM Plex Mono"`;
    ctx.textAlign = "center";
    ctx.fillText(
      `PAGE ${this.page} / ${this.pageCount}   ·   LOCAL FILE`,
      box.x + box.w / 2,
      box.y + box.h - 16,
    );
  }
}

type PptSlide = {
  texts: string[];
  images: HTMLImageElement[];
  bg: string;
};

export class PptxSource implements MediaSource {
  readonly kind: SourceKind = "powerpoint";
  readonly name: string;
  page = 1;
  pageCount = 1;
  private slides: PptSlide[] = [];
  fit: FitMode = "contain";

  constructor(private data: ArrayBuffer, name: string) {
    this.name = name;
  }

  async init() {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(this.data);
    const names = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => {
        const na = Number(a.match(/slide(\d+)/)?.[1] ?? 0);
        const nb = Number(b.match(/slide(\d+)/)?.[1] ?? 0);
        return na - nb;
      });

    const slides: PptSlide[] = [];
    for (const name of names) {
      const xml = (await zip.file(name)?.async("string")) ?? "";
      const texts: string[] = [];
      const re = /<a:t[^>]*>([^<]*)<\/a:t>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml))) {
        const t = decodeXml(m[1] ?? "").trim();
        if (t) texts.push(t);
      }
      const images: HTMLImageElement[] = [];
      const relName = name.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
      const rels = (await zip.file(relName)?.async("string")) ?? "";
      const targets = [...rels.matchAll(/Target="([^"]+)"/g)].map((x) => x[1] ?? "");
      for (const target of targets) {
        if (!/\.(png|jpe?g|gif|webp|bmp)$/i.test(target)) continue;
        const path = resolveZipPath(name, target);
        const file = zip.file(path);
        if (!file) continue;
        const blob = await file.async("blob");
        const url = URL.createObjectURL(blob);
        try {
          images.push(await loadImageFromUrl(url));
        } catch {
          /* skip unreadable media */
        }
      }
      const bgMatch = xml.match(/<a:srgbClr val="([0-9A-Fa-f]{6})"/);
      slides.push({
        texts,
        images,
        bg: bgMatch ? `#${bgMatch[1]}` : "#141416",
      });
    }
    this.slides = slides.length
      ? slides
      : [{ texts: ["Empty deck"], images: [], bg: "#141416" }];
    this.pageCount = this.slides.length;
    this.page = 1;
  }

  dispose() {
    this.slides = [];
  }

  nextPage() {
    if (this.page < this.pageCount) this.page += 1;
  }

  prevPage() {
    if (this.page > 1) this.page -= 1;
  }

  draw({ ctx, width, height, minimized, time }: DrawFrame) {
    const box = drawWinChrome(ctx, 0, 0, width, height, `PowerPoint  —  ${this.name}`, minimized);
    const slide = this.slides[this.page - 1];
    if (!slide) {
      drawIdentCard(ctx, width, height, "PowerPoint", ["No slides found"]);
      return;
    }
    const pad = 8;
    const sx = box.x + pad;
    const sy = box.y + pad;
    const sw = box.w - pad * 2;
    const sh = box.h - pad * 2 - 28;
    ctx.fillStyle = slide.bg;
    ctx.fillRect(sx, sy, sw, sh);

    if (slide.images[0]) {
      const img = slide.images[0];
      const r = fitRect(img.naturalWidth, img.naturalHeight, sw, sh * 0.62, "cover");
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx, sy, sw, sh * 0.62);
      ctx.clip();
      ctx.drawImage(img, sx + r.x, sy + r.y, r.w, r.h);
      ctx.restore();
    }

    const textTop = slide.images[0] ? sy + sh * 0.64 : sy + sh * 0.18;
    ctx.fillStyle = INK.fg;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const title = slide.texts[0] ?? "Slide";
    ctx.font = `500 ${Math.max(22, sw / 18)}px "IBM Plex Sans"`;
    const titleLines = wrapText(ctx, title, sw - 48);
    titleLines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, sx + 28, textTop + i * Math.max(32, sw / 16));
    });
    ctx.fillStyle = INK.muted;
    ctx.font = `400 ${Math.max(14, sw / 36)}px "IBM Plex Sans"`;
    slide.texts.slice(1, 6).forEach((t, i) => {
      ctx.fillText(t, sx + 28, textTop + Math.max(90, sh * 0.18) + i * Math.max(26, sh * 0.05), sw - 56);
    });

    ctx.fillStyle = INK.subtle;
    ctx.font = `400 ${Math.max(11, width / 90)}px "IBM Plex Mono"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `SLIDE ${this.page} / ${this.pageCount}   ·   ${formatTimecodeLocal(time)}`,
      box.x + box.w / 2,
      box.y + box.h - 16,
    );
  }
}

function formatTimecodeLocal(time: number) {
  const s = Math.floor(time % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(time / 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function decodeXml(s: string) {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "'");
}

function resolveZipPath(slidePath: string, target: string) {
  if (target.startsWith("/")) return target.replace(/^\//, "");
  const base = slidePath.replace(/\/[^/]+$/, "/");
  const parts = (base + target).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out.join("/");
}

export class HtmlSource implements MediaSource {
  readonly kind: SourceKind = "web-page";
  readonly name: string;
  private title = "Local page";
  private blocks: { tag: string; text: string }[] = [];

  constructor(
    private html: string,
    name: string,
  ) {
    this.name = name;
  }

  init() {
    const doc = new DOMParser().parseFromString(this.html, "text/html");
    this.title = doc.title || this.name;
    const nodes = doc.body.querySelectorAll("h1,h2,h3,p,li");
    this.blocks = [...nodes].slice(0, 24).map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
    })).filter((b) => b.text);
    if (this.blocks.length === 0) {
      this.blocks = [{ tag: "p", text: doc.body.textContent?.slice(0, 800) || "Empty document" }];
    }
  }

  draw({ ctx, width, height, minimized }: DrawFrame) {
    const box = drawWinChrome(ctx, 0, 0, width, height, "Microsoft Edge", minimized);
    const tabH = Math.max(36, height * 0.05);
    ctx.fillStyle = "#1b1b1f";
    ctx.fillRect(box.x, box.y, box.w, tabH);
    ctx.fillStyle = INK.elevated;
    ctx.fillRect(box.x + 12, box.y + 6, Math.min(220, box.w * 0.3), tabH - 6);
    ctx.fillStyle = INK.fg;
    ctx.font = `500 ${Math.max(11, width / 90)}px "IBM Plex Sans"`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(this.title, box.x + 24, box.y + tabH / 2 + 2, 200);

    const urlY = box.y + tabH;
    const urlH = Math.max(32, height * 0.045);
    ctx.fillStyle = "#121214";
    ctx.fillRect(box.x, urlY, box.w, urlH);
    fillPill(ctx, box.x + 16, urlY + 6, box.w - 32, urlH - 12, "#1c1c20");
    ctx.fillStyle = INK.subtle;
    ctx.font = `400 ${Math.max(11, width / 96)}px "IBM Plex Mono"`;
    ctx.fillText(`file:///C:/Shows/Local/${this.name}`, box.x + 28, urlY + urlH / 2);

    const cx = box.x;
    const cy = urlY + urlH;
    const cw = box.w;
    const ch = box.y + box.h - cy;
    ctx.fillStyle = "#0e0e10";
    ctx.fillRect(cx, cy, cw, ch);

    let y = cy + 36;
    const padX = cx + 48;
    for (const block of this.blocks) {
      if (y > cy + ch - 40) break;
      if (block.tag === "h1") {
        ctx.fillStyle = INK.fg;
        ctx.font = `500 ${Math.max(28, cw / 18)}px "IBM Plex Sans"`;
        ctx.fillText(block.text, padX, y, cw - 96);
        y += Math.max(48, ch * 0.1);
      } else if (block.tag === "h2" || block.tag === "h3") {
        ctx.fillStyle = INK.accent;
        ctx.font = `500 ${Math.max(18, cw / 28)}px "IBM Plex Sans"`;
        ctx.fillText(block.text, padX, y, cw - 96);
        y += Math.max(32, ch * 0.07);
      } else {
        ctx.fillStyle = INK.muted;
        ctx.font = `400 ${Math.max(14, cw / 42)}px "IBM Plex Sans"`;
        const lines = wrapText(ctx, block.text, cw - 96);
        for (const line of lines.slice(0, 3)) {
          ctx.fillText(line, padX, y, cw - 96);
          y += Math.max(22, ch * 0.04);
        }
        y += 8;
      }
    }
  }
}

function fillPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export class TextSource implements MediaSource {
  readonly kind: SourceKind = "local-file";
  readonly name: string;
  constructor(
    private text: string,
    name: string,
  ) {
    this.name = name;
  }

  draw({ ctx, width, height, minimized }: DrawFrame) {
    const box = drawWinChrome(ctx, 0, 0, width, height, this.name, minimized);
    ctx.fillStyle = "#101012";
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = INK.fg;
    ctx.font = `400 ${Math.max(14, width / 52)}px "IBM Plex Mono"`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const lines = this.text.replace(/\r\n/g, "\n").split("\n").slice(0, 48);
    lines.forEach((line, i) => {
      ctx.fillStyle = INK.subtle;
      ctx.fillText(String(i + 1).padStart(3, " "), box.x + 20, box.y + 20 + i * Math.max(20, height / 32));
      ctx.fillStyle = INK.fg;
      ctx.fillText(line.slice(0, 120), box.x + 64, box.y + 20 + i * Math.max(20, height / 32), box.w - 90);
    });
  }
}

export class FallbackFileSource implements MediaSource {
  readonly kind: SourceKind = "local-file";
  readonly name: string;
  constructor(private file: File) {
    this.name = file.name;
  }

  draw({ ctx, width, height }: DrawFrame) {
    drawIdentCard(ctx, width, height, this.file.name, [
      this.file.type || "Unknown type",
      formatBytes(this.file.size),
      "Loaded locally · routed as a video ident",
      "No network · no cloud",
    ]);
  }
}
