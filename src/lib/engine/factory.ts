import type { MediaSource, SourceKind } from "./types";
import { ApplicationSource, DemoDeckSource, DesktopSource, RUNNING_APPS } from "./sources/apps";
import {
  CaptureSource,
  FallbackFileSource,
  HtmlSource,
  ImageSource,
  PdfSource,
  PptxSource,
  TextSource,
  VideoFileSource,
} from "./sources/file-sources";
import { TestPatternSource } from "./sources/test-pattern";
import { buildDemoPdf, DEMO_HTML } from "./sample-pdf";

export function classifyFile(file: File): SourceKind {
  const n = file.name.toLowerCase();
  const t = file.type;
  if (t.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg|avif|tiff?)$/.test(n)) {
    return "image";
  }
  if (t.startsWith("video/") || /\.(mp4|webm|mov|mkv|avi|m4v|ogv)$/.test(n)) {
    return "video";
  }
  if (t === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (/\.(pptx|ppt|odp)$/.test(n)) return "powerpoint";
  if (/\.(html?|xhtml)$/.test(n) || t === "text/html") return "web-page";
  return "local-file";
}

export function acceptForKind(kind: SourceKind) {
  switch (kind) {
    case "pdf":
      return ".pdf,application/pdf";
    case "powerpoint":
      return ".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "web-page":
      return ".html,.htm,text/html";
    case "video":
      return "video/*,.mp4,.webm,.mov,.mkv";
    case "image":
      return "image/*";
    default:
      return "*/*";
  }
}

export async function createSource(opts: {
  kind: SourceKind;
  file?: File | null;
  appId?: string;
  capture?: boolean;
}): Promise<MediaSource> {
  const { kind, file, appId, capture } = opts;

  if (capture) {
    const src = new CaptureSource(
      kind === "desktop" ? "desktop" : "application",
      kind === "desktop" ? "Desktop (captured)" : "Application window (captured)",
    );
    return src;
  }

  if (file) {
    const detected = classifyFile(file);
    if (detected === "image") return new ImageSource(file);
    if (detected === "video") return new VideoFileSource(file);
    if (detected === "pdf") return new PdfSource(await file.arrayBuffer(), file.name);
    if (detected === "powerpoint") {
      if (file.name.toLowerCase().endsWith(".ppt") && !file.name.toLowerCase().endsWith(".pptx")) {
        return new FallbackFileSource(file);
      }
      try {
        return new PptxSource(await file.arrayBuffer(), file.name);
      } catch {
        return new FallbackFileSource(file);
      }
    }
    if (detected === "web-page") return new HtmlSource(await file.text(), file.name);
    if (file.type.startsWith("text/") || /\.(txt|md|csv|json|log|xml)$/i.test(file.name)) {
      return new TextSource(await file.text(), file.name);
    }
    return new FallbackFileSource(file);
  }

  if (kind === "application") {
    const app = RUNNING_APPS.find((a) => a.id === appId) ?? RUNNING_APPS[0]!;
    return new ApplicationSource(app);
  }
  if (kind === "desktop") return new DesktopSource();
  if (kind === "powerpoint") return new DemoDeckSource();
  if (kind === "pdf") return new PdfSource(buildDemoPdf(), "Stage Plot.pdf");
  if (kind === "web-page") return new HtmlSource(DEMO_HTML, "index.html");
  if (kind === "video") return new TestPatternSource();
  if (kind === "image") return new TestPatternSource();
  if (kind === "local-file") return new TestPatternSource();
  return new TestPatternSource();
}
