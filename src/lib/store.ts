import { create } from "zustand";
import {
  FPS_OPTIONS,
  RESOLUTIONS,
  type FitMode,
  type SourceKind,
} from "@/lib/engine/types";

export type RunStatus = "idle" | "live" | "reconnecting" | "error";

type CaptainState = {
  sourceKind: SourceKind;
  appId: string;
  fileName: string | null;
  resolutionId: string;
  fps: (typeof FPS_OPTIONS)[number];
  fit: FitMode;
  live: boolean;
  minimized: boolean;
  programOut: boolean;
  spoutName: string;
  status: RunStatus;
  actualFps: number;
  frame: number;
  dropped: number;
  time: number;
  page: number;
  pageCount: number;
  sourceLabel: string;
  error: string | null;
  setSourceKind: (kind: SourceKind) => void;
  setAppId: (id: string) => void;
  setFileName: (name: string | null) => void;
  setResolutionId: (id: string) => void;
  setFps: (fps: (typeof FPS_OPTIONS)[number]) => void;
  setFit: (fit: FitMode) => void;
  setLive: (live: boolean) => void;
  setMinimized: (v: boolean) => void;
  setProgramOut: (v: boolean) => void;
  setSpoutName: (name: string) => void;
  setStatus: (status: RunStatus) => void;
  setStats: (s: { fps: number; frame: number; dropped: number; time: number }) => void;
  setPages: (page: number, pageCount: number) => void;
  setSourceLabel: (label: string) => void;
  setError: (error: string | null) => void;
};

const SETTINGS_KEY = "desktop-capture-settings";

export const useCaptain = create<CaptainState>((set, get) => ({
  sourceKind: "test-pattern",
  appId: "chrome",
  fileName: null,
  resolutionId: "1080p",
  fps: 60,
  fit: "contain",
  live: false,
  minimized: false,
  programOut: false,
  spoutName: "DesktopCapture",
  status: "idle",
  actualFps: 0,
  frame: 0,
  dropped: 0,
  time: 0,
  page: 1,
  pageCount: 1,
  sourceLabel: "SMPTE Ident",
  error: null,
  setSourceKind: (sourceKind) => {
    set({ sourceKind, error: null });
    persist();
  },
  setAppId: (appId) => {
    set({ appId });
    persist();
  },
  setFileName: (fileName) => set({ fileName }),
  setResolutionId: (resolutionId) => {
    set({ resolutionId });
    persist();
  },
  setFps: (fps) => {
    set({ fps });
    persist();
  },
  setFit: (fit) => set({ fit }),
  setLive: (live) =>
    set({
      live,
      status: live ? "live" : "idle",
      error: live ? null : get().error,
    }),
  setMinimized: (minimized) => set({ minimized }),
  setProgramOut: (programOut) => set({ programOut }),
  setSpoutName: (spoutName) => {
    set({ spoutName });
    persist();
  },
  setStatus: (status) => set({ status }),
  setStats: ({ fps, frame, dropped, time }) =>
    set({ actualFps: fps, frame, dropped, time }),
  setPages: (page, pageCount) => set({ page, pageCount }),
  setSourceLabel: (sourceLabel) => set({ sourceLabel }),
  setError: (error) => set({ error, status: error ? "error" : get().status }),
}));

function persist() {
  if (typeof window === "undefined") return;
  const s = useCaptain.getState();
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      resolutionId: s.resolutionId,
      fps: s.fps,
      spoutName: s.spoutName,
    }),
  );
}

export function hydrateSettings() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw) as Partial<CaptainState>;
    const fps = FPS_OPTIONS.includes(s.fps as (typeof FPS_OPTIONS)[number])
      ? (s.fps as (typeof FPS_OPTIONS)[number])
      : undefined;
    useCaptain.setState({
      ...(s.resolutionId && RESOLUTIONS.some((r) => r.id === s.resolutionId)
        ? { resolutionId: s.resolutionId }
        : {}),
      ...(fps ? { fps } : {}),
      ...(s.spoutName ? { spoutName: s.spoutName } : {}),
    });
  } catch {
    /* ignore corrupt settings */
  }
}

export function currentResolution() {
  const id = useCaptain.getState().resolutionId;
  return RESOLUTIONS.find((r) => r.id === id) ?? RESOLUTIONS[1]!;
}
