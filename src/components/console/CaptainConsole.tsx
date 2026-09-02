import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AppWindow,
  FileText,
  FolderOpen,
  Globe,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Monitor,
  Play,
  Presentation,
  Square,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { acceptForKind, classifyFile } from "@/lib/engine/factory";
import { RUNNING_APPS } from "@/lib/engine/sources/apps";
import {
  FPS_OPTIONS,
  RESOLUTIONS,
  SOURCE_OPTIONS,
  type SourceKind,
} from "@/lib/engine/types";
import { useEngine } from "@/lib/engine/use-engine";
import { hydrateSettings, useCaptain } from "@/lib/store";
import { cn, formatTimecode } from "@/lib/utils";

const KIND_ICON: Record<SourceKind, typeof Monitor> = {
  "test-pattern": Monitor,
  "local-file": FolderOpen,
  "web-page": Globe,
  pdf: FileText,
  powerpoint: Presentation,
  application: AppWindow,
  desktop: Monitor,
  video: Video,
  image: ImageIcon,
};

export function CaptainConsole() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scopeRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const dropDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [fileEpoch, setFileEpoch] = useState(0);
  const [capture, setCapture] = useState(false);

  const sourceKind = useCaptain((s) => s.sourceKind);
  const appId = useCaptain((s) => s.appId);
  const resolutionId = useCaptain((s) => s.resolutionId);
  const fps = useCaptain((s) => s.fps);
  const live = useCaptain((s) => s.live);
  const minimized = useCaptain((s) => s.minimized);
  const programOut = useCaptain((s) => s.programOut);
  const spoutName = useCaptain((s) => s.spoutName);
  const status = useCaptain((s) => s.status);
  const actualFps = useCaptain((s) => s.actualFps);
  const time = useCaptain((s) => s.time);
  const page = useCaptain((s) => s.page);
  const pageCount = useCaptain((s) => s.pageCount);
  const sourceLabel = useCaptain((s) => s.sourceLabel);
  const fileName = useCaptain((s) => s.fileName);
  const error = useCaptain((s) => s.error);
  const fit = useCaptain((s) => s.fit);

  const engineRef = useEngine(canvasRef, fileRef, fileEpoch, capture);
  const res = RESOLUTIONS.find((r) => r.id === resolutionId) ?? RESOLUTIONS[1]!;

  useEffect(() => {
    hydrateSettings();
  }, []);
  const KindIcon = KIND_ICON[sourceKind];
  const statusTone =
    status === "live" && live ? "live" : status === "error" ? "tally" : "idle";

  const loadFile = useCallback((file: File) => {
    fileRef.current = file;
    useCaptain.getState().setFileName(file.name);
    setCapture(false);
    useCaptain.getState().setSourceKind(classifyFile(file));
    setFileEpoch((n) => n + 1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        useCaptain.getState().setLive(!useCaptain.getState().live);
      } else if (e.key === "m" || e.key === "M") {
        useCaptain.getState().setMinimized(!useCaptain.getState().minimized);
      } else if (e.key === "f" || e.key === "F") {
        void toggleProgramOut();
      } else if (e.key === "ArrowRight") {
        engineRef.current?.getSource()?.nextPage?.();
      } else if (e.key === "ArrowLeft") {
        engineRef.current?.getSource()?.prevPage?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engineRef]);

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) useCaptain.getState().setProgramOut(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const scope = scopeRef.current;
    const src = canvasRef.current;
    if (!scope || !src) return;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 80) return;
      last = t;
      const dctx = scope.getContext("2d");
      const sctx = src.getContext("2d");
      if (!dctx || !sctx || src.width === 0) return;
      const rowY = Math.floor(src.height * 0.5);
      const row = sctx.getImageData(0, rowY, src.width, 1).data;
      const dw = scope.width;
      const dh = scope.height;
      dctx.fillStyle = "#0a0a0b";
      dctx.fillRect(0, 0, dw, dh);
      dctx.beginPath();
      for (let i = 0; i < dw; i++) {
        const sx = Math.floor((i / dw) * src.width);
        const r = row[sx * 4] ?? 0;
        const g = row[sx * 4 + 1] ?? 0;
        const b = row[sx * 4 + 2] ?? 0;
        const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const py = dh - 3 - (y / 255) * (dh - 6);
        if (i === 0) dctx.moveTo(i, py);
        else dctx.lineTo(i, py);
      }
      dctx.strokeStyle = "#5dba7a";
      dctx.lineWidth = 1.25;
      dctx.stroke();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  async function toggleProgramOut() {
    const next = !useCaptain.getState().programOut;
    useCaptain.getState().setProgramOut(next);
    try {
      if (next) await document.documentElement.requestFullscreen();
      else if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* preview hosts may block fullscreen */
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dropDepth.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }

  return (
    <div
      className="relative min-h-dvh bg-bg text-fg"
      onDragEnter={(e) => {
        e.preventDefault();
        dropDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        dropDepth.current = Math.max(0, dropDepth.current - 1);
        if (dropDepth.current === 0) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept={acceptForKind(sourceKind)}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadFile(file);
          e.target.value = "";
        }}
      />

      <header
        className={cn(
          "flex items-center justify-between gap-3 border-b border-border px-4 py-3",
          (minimized || programOut) && "hidden",
        )}
      >
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-[0.18em] text-subtle uppercase">
            Local · Offline · Spout
          </p>
          <h1 className="truncate text-lg font-medium tracking-tight">Desktop Capture</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge tone={statusTone}>
            <span className={cn("size-1.5 rounded-full", live ? "bg-live" : "bg-muted")} />
            {live ? "Local" : "Standby"} / {actualFps || 0} FPS
          </Badge>
          <span className="hidden font-mono text-xs text-muted tabular-nums sm:inline">
            {res.label} · {formatTimecode(time, fps)}
          </span>
        </div>
      </header>

      <div
        className={cn(
          "grid lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)_minmax(16rem,18rem)]",
          (minimized || programOut) && "grid-cols-1",
        )}
      >
        <aside
          className={cn(
            "border-b border-border p-4 lg:border-r lg:border-b-0",
            (minimized || programOut) && "hidden",
          )}
        >
          <Field label="Source">
            <Select
              value={sourceKind}
              onValueChange={(v) => {
                fileRef.current = null;
                useCaptain.getState().setFileName(null);
                setCapture(false);
                useCaptain.getState().setSourceKind(v as SourceKind);
              }}
            >
              <SelectTrigger aria-label="Select source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.kind} value={opt.kind}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <p className="mt-2 text-xs text-pretty text-muted">
            {SOURCE_OPTIONS.find((o) => o.kind === sourceKind)?.hint}
          </p>

          {(sourceKind === "local-file" ||
            sourceKind === "pdf" ||
            sourceKind === "powerpoint" ||
            sourceKind === "web-page" ||
            sourceKind === "video" ||
            sourceKind === "image") && (
            <Button
              variant="secondary"
              className="mt-4 w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <FolderOpen />
              {fileName ? "Replace file" : "Load local file"}
            </Button>
          )}
          {fileName && (
            <p className="mt-2 truncate font-mono text-xs text-muted">{fileName}</p>
          )}

          {sourceKind === "application" && (
            <div className="mt-4">
              <p className="mb-2 font-mono text-xs tracking-wide text-subtle uppercase">
                Running programs
              </p>
              <ul className="flex max-h-64 flex-col gap-1 overflow-auto">
                {RUNNING_APPS.map((app) => (
                  <li key={app.id}>
                    <button
                      type="button"
                      onClick={() => {
                        fileRef.current = null;
                        setCapture(false);
                        useCaptain.getState().setAppId(app.id);
                      }}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-3 rounded-sm px-3 text-left text-sm transition-colors duration-[var(--motion-quick)]",
                        appId === app.id && !capture
                          ? "bg-elevated text-fg"
                          : "text-muted hover:bg-elevated hover:text-fg",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          appId === app.id && !capture ? "bg-live" : "bg-subtle",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{app.title}</span>
                        <span className="block truncate font-mono text-xs text-subtle">
                          {app.detail}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => {
                  fileRef.current = null;
                  setCapture(true);
                  setFileEpoch((n) => n + 1);
                  useCaptain.getState().setLive(true);
                }}
              >
                <AppWindow />
                Capture a real window
              </Button>
            </div>
          )}

          {sourceKind === "desktop" && (
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => {
                fileRef.current = null;
                setCapture(true);
                setFileEpoch((n) => n + 1);
                useCaptain.getState().setLive(true);
              }}
            >
              <Monitor />
              Capture this desktop
            </Button>
          )}

          <Separator className="my-5" />

          <Field label="Resolution">
            <Select
              value={resolutionId}
              onValueChange={(v) => useCaptain.getState().setResolutionId(v)}
            >
              <SelectTrigger aria-label="Resolution">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTIONS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="mt-4">
            <Field label="FPS">
              <Select
                value={String(fps)}
                onValueChange={(v) =>
                  useCaptain.getState().setFps(Number(v) as (typeof FPS_OPTIONS)[number])
                }
              >
                <SelectTrigger aria-label="FPS">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FPS_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Fit">
              <Select
                value={fit}
                onValueChange={(v) =>
                  useCaptain.getState().setFit(v as "contain" | "cover" | "stretch")
                }
              >
                <SelectTrigger aria-label="Fit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contain">Contain</SelectItem>
                  <SelectItem value="cover">Cover</SelectItem>
                  <SelectItem value="stretch">Stretch</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {pageCount > 1 && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => engineRef.current?.getSource()?.prevPage?.()}
              >
                Prev
              </Button>
              <span className="flex h-11 min-w-14 items-center justify-center font-mono text-xs text-muted tabular-nums">
                {page}/{pageCount}
              </span>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => engineRef.current?.getSource()?.nextPage?.()}
              >
                Next
              </Button>
            </div>
          )}
        </aside>

        <section
          className={cn(
            "flex min-h-0 flex-col p-4",
            programOut && "h-dvh p-0",
            minimized && !programOut && "min-h-dvh justify-end p-4",
          )}
        >
          <div
            className={cn(
              "relative flex min-h-[220px] flex-1 items-center justify-center overflow-hidden rounded-lg bg-surface p-2",
              programOut && "rounded-none bg-bg p-0",
              minimized && !programOut && "h-16 min-h-0 flex-none p-1",
            )}
          >
            <div
              className={cn(
                "relative w-full overflow-hidden rounded-sm bg-bg",
                live && !programOut && "ring-1 ring-live/50",
                minimized && !programOut && "max-w-32",
              )}
            >
              <canvas
                ref={canvasRef}
                className="block h-auto w-full"
                style={{ aspectRatio: `${res.w} / ${res.h}` }}
              />
              {!programOut && !minimized && (
                <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-3">
                  <span className="rounded-sm bg-bg/70 px-2 py-1 font-mono text-xs tracking-wide text-muted uppercase">
                    Program
                  </span>
                  <span className="rounded-sm bg-bg/70 px-2 py-1 font-mono text-xs text-muted tabular-nums">
                    {res.label} · {fps}p
                  </span>
                </div>
              )}
            </div>
          </div>

          {minimized && !programOut && (
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-surface p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{sourceLabel}</p>
                <p className="font-mono text-xs text-muted tabular-nums">
                  {live ? "LOCAL LOCK" : "STANDBY"} · {actualFps || fps} FPS · {res.label}
                </p>
              </div>
              <Badge tone={statusTone}>{live ? "Live" : "Idle"}</Badge>
              <Button
                size="icon"
                variant="secondary"
                aria-label="Restore"
                onClick={() => useCaptain.getState().setMinimized(false)}
              >
                <Maximize2 />
              </Button>
            </div>
          )}

          {!programOut && !minimized && (
            <>
              <div className="mt-3 overflow-hidden rounded-md bg-surface p-2">
                <p className="mb-1 font-mono text-xs tracking-wide text-subtle uppercase">
                  Luma
                </p>
                <canvas ref={scopeRef} width={640} height={64} className="h-12 w-full" />
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant={live ? "secondary" : "live"}
                  className="flex-1"
                  onClick={() => useCaptain.getState().setLive(true)}
                >
                  <Play className="ml-0.5" />
                  Start
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => useCaptain.getState().setLive(false)}
                >
                  <Square />
                  Stop
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => useCaptain.getState().setMinimized(true)}
                >
                  <Minimize2 />
                  Minimize
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => void toggleProgramOut()}>
                  <Maximize2 />
                  Output
                </Button>
              </div>
              {error && <p className="mt-3 text-sm text-pretty text-tally">{error}</p>}
            </>
          )}
        </section>

        <aside
          className={cn(
            "border-t border-border p-4 lg:border-t-0 lg:border-l",
            (minimized || programOut) && "hidden",
          )}
        >
          <p className="font-mono text-xs tracking-wide text-subtle uppercase">Pipeline</p>
          <ol className="mt-3 space-y-2">
            {[
              { k: "Source", v: sourceLabel },
              { k: "Capture", v: minimized ? "Minimized window" : "Visible window" },
              { k: "Texture", v: `${res.w}×${res.h} @ ${fps}` },
              { k: "Spout", v: spoutName },
              { k: "Arena", v: "Layer → composition → output" },
            ].map((row) => (
              <li key={row.k} className="rounded-md bg-elevated px-3 py-2">
                <p className="font-mono text-xs tracking-wide text-subtle uppercase">{row.k}</p>
                <p className="truncate text-sm">{row.v}</p>
              </li>
            ))}
          </ol>

          <Separator className="my-5" />

          <label className="block">
            <span className="mb-2 block font-mono text-xs tracking-wide text-subtle uppercase">
              Spout sender
            </span>
            <input
              value={spoutName}
              onChange={(e) => useCaptain.getState().setSpoutName(e.target.value)}
              className="h-11 w-full rounded-sm bg-elevated px-3 font-mono text-sm text-fg shadow-[0_0_0_1px_rgba(255,255,255,0.08)] outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            />
          </label>

          <div className="mt-5 rounded-md bg-elevated p-3">
            <p className="font-medium">Resolume Arena</p>
            <p className="mt-1 text-sm text-pretty text-muted">
              Sources → Spout → {spoutName} → Layer. Or window-capture this program
              monitor as a clean feed. DRM and elevated apps may block capture.
            </p>
          </div>

          <div className="mt-5 flex items-start gap-2 text-sm text-muted">
            <KindIcon className="mt-0.5 size-4 shrink-0" />
            <p className="text-pretty">
              Everything runs on this PC. No Wi-Fi, Bluetooth, or cloud in the path.
            </p>
          </div>
        </aside>
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-bg/80">
          <div className="rounded-lg bg-surface px-6 py-5 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
            <p className="font-medium">Drop a local file</p>
            <p className="mt-1 text-sm text-muted">PDF, PowerPoint, video, image, HTML</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-xs tracking-wide text-subtle uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
