import { useEffect, useRef } from "react";
import { Compositor } from "./compositor";
import { createSource } from "./factory";
import { currentResolution, useCaptain } from "@/lib/store";
import { waitFonts } from "@/lib/utils";

export function useEngine(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  fileRef: React.RefObject<File | null>,
  reloadKey: number,
  capture: boolean,
) {
  const engineRef = useRef<Compositor | null>(null);
  const sourceKind = useCaptain((s) => s.sourceKind);
  const appId = useCaptain((s) => s.appId);
  const resolutionId = useCaptain((s) => s.resolutionId);
  const fps = useCaptain((s) => s.fps);
  const minimized = useCaptain((s) => s.minimized);
  const fit = useCaptain((s) => s.fit);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Compositor(canvas, (stats) => {
      useCaptain.getState().setStats(stats);
      const src = engine.getSource();
      if (src) {
        useCaptain.getState().setPages(src.page ?? 1, src.pageCount ?? 1);
      }
    });
    engineRef.current = engine;
    const res = currentResolution();
    engine.resize(res.w, res.h);
    engine.setFps(useCaptain.getState().fps);
    engine.start();
    void waitFonts();
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [canvasRef]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const res = currentResolution();
    engine.resize(res.w, res.h);
  }, [resolutionId]);

  useEffect(() => {
    engineRef.current?.setFps(fps);
  }, [fps]);

  useEffect(() => {
    engineRef.current?.setMinimized(minimized);
  }, [minimized]);

  useEffect(() => {
    if (engineRef.current) engineRef.current.fit = fit;
  }, [fit]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    let cancelled = false;
    const wantCapture =
      capture && (sourceKind === "application" || sourceKind === "desktop");
    void (async () => {
      try {
        const source = await createSource({
          kind: sourceKind,
          file: fileRef.current,
          appId,
          capture: wantCapture,
        });
        if (cancelled) {
          source.dispose?.();
          return;
        }
        if ("onEnded" in source) {
          (source as { onEnded?: () => void }).onEnded = () => {
            useCaptain.getState().setStatus("reconnecting");
            useCaptain.getState().setError(
              "Source window closed. Recapture to restore the feed.",
            );
          };
        }
        await engine.setSource(source);
        useCaptain.getState().setSourceLabel(source.name);
        useCaptain.getState().setError(null);
        if (wantCapture) useCaptain.getState().setStatus("live");
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Could not open that source.";
        const denied =
          message.toLowerCase().includes("denied") ||
          message.toLowerCase().includes("permission") ||
          message.toLowerCase().includes("not allowed");
        useCaptain.getState().setError(
          denied
            ? "Window capture was blocked. Use a built-in program from the list, or allow screen capture."
            : message,
        );
        const fallback = await createSource({ kind: "test-pattern" });
        await engine.setSource(fallback);
        useCaptain.getState().setSourceLabel(fallback.name);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceKind, appId, reloadKey, capture, fileRef]);

  return engineRef;
}
