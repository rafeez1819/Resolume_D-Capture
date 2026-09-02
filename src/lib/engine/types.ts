export type SourceKind =
  | "test-pattern"
  | "local-file"
  | "web-page"
  | "pdf"
  | "powerpoint"
  | "application"
  | "desktop"
  | "video"
  | "image";

export type FitMode = "contain" | "cover" | "stretch";

export type DrawFrame = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  time: number;
  frame: number;
  fps: number;
  minimized: boolean;
  fit: FitMode;
};

export interface MediaSource {
  readonly name: string;
  readonly kind: SourceKind;
  readonly pageCount?: number;
  page?: number;
  init?(): Promise<void> | void;
  dispose?(): void;
  draw(frame: DrawFrame): void;
  nextPage?(): void;
  prevPage?(): void;
}

export type EngineStats = {
  fps: number;
  frame: number;
  dropped: number;
  time: number;
};

export type ResolutionPreset = {
  id: string;
  w: number;
  h: number;
  label: string;
};

export const RESOLUTIONS: ResolutionPreset[] = [
  { id: "720p", w: 1280, h: 720, label: "1280 × 720" },
  { id: "1080p", w: 1920, h: 1080, label: "1920 × 1080" },
  { id: "1080p-p", w: 1080, h: 1920, label: "1080 × 1920" },
  { id: "1200p", w: 1920, h: 1200, label: "1920 × 1200" },
  { id: "square", w: 1920, h: 1920, label: "1920 × 1920" },
  { id: "1440p", w: 2560, h: 1440, label: "2560 × 1440" },
  { id: "triple", w: 3840, h: 1080, label: "3840 × 1080" },
  { id: "uhd", w: 3840, h: 2160, label: "3840 × 2160" },
];

export const FPS_OPTIONS = [24, 25, 30, 50, 60] as const;

export const SOURCE_OPTIONS: { kind: SourceKind; label: string; hint: string }[] =
  [
    { kind: "test-pattern", label: "Test Pattern", hint: "Broadcast ident / bars" },
    { kind: "local-file", label: "Local File", hint: "Any compatible file" },
    { kind: "web-page", label: "Web Page", hint: "Local HTML" },
    { kind: "pdf", label: "PDF Document", hint: "Rendered pages" },
    { kind: "powerpoint", label: "PowerPoint", hint: "Local .pptx slides" },
    { kind: "application", label: "Application Window", hint: "Any running program" },
    { kind: "desktop", label: "Desktop", hint: "Full local desktop" },
    { kind: "video", label: "Video File", hint: "MP4 / WebM / MOV" },
    { kind: "image", label: "Image", hint: "Still graphics" },
  ];

export const INK = {
  bg: "#0a0a0b",
  surface: "#121214",
  elevated: "#1a1a1e",
  fg: "#f0f1f3",
  muted: "#9a9aa3",
  subtle: "#6b6b73",
  border: "#26262c",
  accent: "#c5ccd6",
  live: "#5dba7a",
  tally: "#d4544a",
  warn: "#c4a35a",
} as const;
