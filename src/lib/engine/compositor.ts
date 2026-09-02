import type { EngineStats, FitMode, MediaSource } from "./types";
import { INK } from "./types";

export class Compositor {
  private ctx: CanvasRenderingContext2D | null = null;
  private source: MediaSource | null = null;
  private raf = 0;
  private running = false;
  private lastTs = 0;
  private acc = 0;
  private startMs = 0;
  private frame = 0;
  private dropped = 0;
  private measuredFps = 0;
  private fpsMarks: number[] = [];
  private lastStats = 0;
  private width = 1920;
  private height = 1080;
  private fps = 60;
  private minimized = false;
  fit: FitMode = "contain";

  constructor(
    private canvas: HTMLCanvasElement,
    private onStats?: (stats: EngineStats) => void,
  ) {
    this.attach();
  }

  private attach() {
    this.ctx = this.canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });
    this.resize(this.width, this.height);
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.stop();
    this.canvas = canvas;
    this.attach();
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  setFps(fps: number) {
    this.fps = Math.max(1, fps);
  }

  setMinimized(value: boolean) {
    this.minimized = value;
  }

  async setSource(source: MediaSource | null) {
    this.source?.dispose?.();
    this.source = source;
    if (source?.init) await source.init();
    this.drawFrame(this.startMs ? (performance.now() - this.startMs) / 1000 : 0);
  }

  getSource() {
    return this.source;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTs = 0;
    this.acc = 0;
    this.startMs = performance.now();
    this.frame = 0;
    this.dropped = 0;
    this.fpsMarks = [];
    this.drawFrame(0);
    this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  dispose() {
    this.stop();
    this.source?.dispose?.();
    this.source = null;
  }

  snapshot(): HTMLCanvasElement {
    return this.canvas;
  }

  private tick = (ts: number) => {
    this.raf = requestAnimationFrame(this.tick);
    if (!this.running) return;
    if (!this.lastTs) {
      this.lastTs = ts;
      this.drawFrame(0);
      return;
    }
    const dt = ts - this.lastTs;
    this.lastTs = ts;
    const interval = 1000 / this.fps;
    this.acc += dt;
    let produced = 0;
    while (this.acc >= interval) {
      this.acc -= interval;
      produced += 1;
      if (produced > 1) this.dropped += 1;
    }
    if (produced > 0) {
      const time = (ts - this.startMs) / 1000;
      this.drawFrame(time);
      this.fpsMarks.push(ts);
      const cutoff = ts - 1000;
      this.fpsMarks = this.fpsMarks.filter((m) => m >= cutoff);
      this.measuredFps = this.fpsMarks.length;
    }
    if (ts - this.lastStats > 200) {
      this.lastStats = ts;
      this.onStats?.({
        fps: this.measuredFps,
        frame: this.frame,
        dropped: this.dropped,
        time: (ts - this.startMs) / 1000,
      });
    }
  };

  private drawFrame(time: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    this.frame += 1;
    ctx.fillStyle = INK.bg;
    ctx.fillRect(0, 0, this.width, this.height);
    this.source?.draw({
      ctx,
      width: this.width,
      height: this.height,
      time,
      frame: this.frame,
      fps: this.fps,
      minimized: this.minimized,
      fit: this.fit,
    });
  }
}
