# Resolume_D-Capture
D-Capture is a local-first desktop capture and media playback system designed for professional AV, LED wall, live events, VJ workflows, and Resolume Arena.


# D-Capture

### Professional Local Capture & Playback Bridge for Resolume Arena

D-Capture is a local-first desktop capture and media playback system designed for professional AV, LED wall, live events, VJ workflows, and **Resolume Arena**.

The project provides a unified interface for loading media, rendering documents, previewing sources, and capturing desktop/application content.

The long-term goal is to provide a reliable **Windows GPU capture → Spout → Resolume Arena** workflow without depending on Wi-Fi, Bluetooth, cloud services, or remote streaming.

---

## Overview

D-Capture is designed around a simple concept:

```text
                    D-CAPTURE
                        │
            ┌───────────┴───────────┐
            │                       │
       FILE SOURCES           APPLICATION SOURCES
            │                       │
      ┌─────┼─────┐          ┌──────┼─────────┐
      │     │     │          │      │         │
     PDF   PPTX  HTML       Chrome PowerPoint VLC
      │     │     │          │      │         │
      └─────┴─────┴──────────┴──────┴─────────┘
                        │
                        ▼
                  D-Capture Engine
                        │
                        ▼
                   GPU Pipeline
                        │
                        ▼
                    Spout Sender
                        │
                        ▼
                  Resolume Arena
```

---

# Features

## Current Features

* Local-first application architecture
* React + TypeScript interface
* Vite development environment
* Desktop source
* Application/window source workflow
* Local file loading
* PDF rendering
* PPTX parsing and rendering
* HTML/web content support
* Preview/compositor engine
* Test pattern source
* Source switching
* FPS and resolution controls
* Local application state
* Error handling and diagnostics

## Planned Native Capture Features

The native Windows capture layer is intended to provide:

* Windows Graphics Capture
* Real application/window enumeration
* HWND/process detection
* Monitor capture
* Desktop capture
* GPU-based D3D11 texture pipeline
* Minimized-window capture where supported by Windows
* PowerPoint live-window capture
* Chrome/Edge/VLC/Adobe/etc. application capture
* Spout output
* Direct GPU path into Resolume Arena
* Stable 30/60 FPS operation
* Resolution matching
* No unnecessary CPU frame copies

---

# Capture Architecture

The browser version uses the standard browser Screen Capture API for real desktop/window capture.

```text
Browser
   │
   └── getDisplayMedia()
             │
             ▼
        Video Stream
             │
             ▼
          Canvas
             │
             ▼
       D-Capture Preview
```

This is useful for development and testing, but it has limitations.

The planned professional Windows pipeline is:

```text
Windows Application
        │
        ▼
Windows Graphics Capture
        │
        ▼
       D3D11
        │
        ▼
   GPU Texture
        │
        ▼
   Spout Sender
        │
        ▼
 Resolume Arena
```

The native pipeline is intentionally separated from the React/Vite interface.

---

# Supported Source Types

| Source                 |            Current | Native Target |
| ---------------------- | -----------------: | ------------: |
| Test Pattern           |                  ✅ |             ✅ |
| PDF                    |                  ✅ |             ✅ |
| PPTX File              |                  ✅ |             ✅ |
| HTML/Web               |                  ✅ |             ✅ |
| Desktop Preview        |                  ✅ |             ✅ |
| Browser Window         | ⚠️ Browser capture |             ✅ |
| PowerPoint Window      |  ⚠️ Visible window |             ✅ |
| VLC                    | ⚠️ Browser capture |             ✅ |
| Adobe Applications     | ⚠️ Browser capture |             ✅ |
| Minimized Applications |                  ❌ |    🚧 Planned |
| Spout Output           |         🚧 Planned |    🚧 Planned |

---

# PowerPoint

D-Capture supports `.pptx` files through the application's document rendering pipeline.

A local PPTX file can be loaded into D-Capture and displayed through the compositor.

```text
Presentation.pptx
       │
       ▼
      JSZip
       │
       ▼
  PPTX slide data
       │
       ▼
   D-Capture Engine
       │
       ▼
      Canvas
```

### Important

Loading a `.pptx` file is different from capturing Microsoft PowerPoint itself.

For a real PowerPoint presentation running on Windows:

```text
Microsoft PowerPoint
        │
        ▼
Windows Graphics Capture
        │
        ▼
      D3D11
        │
        ▼
      Spout
        │
        ▼
   Resolume Arena
```

This native capture path is the target architecture for professional presentation playback.

---

# Desktop Capture

The browser implementation requires an explicit user action.

Recommended workflow:

```text
Source
  ↓
Desktop
  ↓
Capture this desktop
  ↓
Select Entire Screen / Monitor
  ↓
Allow screen sharing
  ↓
Live preview
```

This is required because browsers control access to screen capture through their security and permission model.

---

# Minimized Applications

True minimized application capture is **not guaranteed through `getDisplayMedia()`**.

A browser cannot be treated as a professional Windows capture driver.

For example:

```text
Chrome minimized
      ↓
Browser Screen Capture
      ↓
Not guaranteed
```

The planned native implementation uses:

```text
Application HWND
      ↓
Windows Graphics Capture
      ↓
D3D11
      ↓
Spout
      ↓
Resolume
```

This allows D-Capture to move toward professional application capture independent of the browser's screen-sharing limitations.

> Note: Windows, applications, DRM surfaces, hardware overlays, and applications that stop rendering while minimized can still impose capture restrictions. D-Capture will report those conditions rather than falsely claiming universal minimized capture.

---

# Project Structure

```text
D-Capture/
│
├── .grok/
├── .tanstack/
├── .vercel/
│
├── artifacts/
├── migrations/
├── public/
├── screenshots/
├── scripts/
├── server/
│
└── src/
    │
    ├── components/
    │   └── console/
    │       └── CaptainConsole.tsx
    │
    ├── lib/
    │   │
    │   ├── engine/
    │   │   ├── compositor.ts
    │   │   ├── draw-chrome.ts
    │   │   ├── factory.ts
    │   │   ├── fit.ts
    │   │   ├── sample-pdf.ts
    │   │   ├── types.ts
    │   │   ├── use-engine.ts
    │   │   │
    │   │   └── sources/
    │   │       ├── apps.ts
    │   │       ├── file-sources.ts
    │   │       └── test-pattern.ts
    │   │
    │   └── store.ts
    │
    └── routes/
        ├── index.tsx
        └── __root.tsx
```

---

# Technology Stack

### Frontend

* React
* TypeScript
* TanStack Router
* TanStack React Query
* Tailwind CSS
* Radix UI
* Zustand
* Lucide React

### Rendering

* Canvas
* PDF.js
* JSZip
* Browser Media Capture API

### Build

* Vite
* TypeScript
* ESLint
* Prettier
* Node.js

The current project uses Vite `8.x`, React `19.x`, TypeScript `5.x`, PDF.js, JSZip, and related dependencies defined in `package.json`.

---

# Requirements

## Development

Recommended environment:

* Windows 10/11
* Node.js
* npm
* Modern Chromium-based browser
* Microsoft PowerPoint for live PowerPoint window capture
* Resolume Arena for Spout output testing

---

# Installation

Clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>
cd D-Capture
```

Install dependencies:

```bash
npm install
```

---

# Development

Start the development server:

```bash
npm run dev
```

The current development script starts Vite on:

```text
http://localhost:8686/
```

The server is configured to listen on all interfaces:

```text
0.0.0.0:8686
```

This is defined in the current `package.json`.

---

# Available Commands

```bash
npm run dev
```

Start the development server.

```bash
npm run build
```

Create a production build and run the database migration step.

```bash
npm run build:dev
```

Create a development-mode production build.

```bash
npm run preview
```

Preview the production build.

```bash
npm run typecheck
```

Run TypeScript checks.

```bash
npm run test
```

Run the project tests.

```bash
npm run lint
```

Run ESLint.

```bash
npm run format
```

Format the project using Prettier.

These scripts are currently defined by the project configuration.

---

# Resolume Arena Workflow

The intended professional workflow is:

```text
D-Capture
    │
    │ Local File / Application
    │
    ▼
Capture Engine
    │
    ▼
D3D11 GPU Texture
    │
    ▼
Spout Sender
    │
    ▼
Resolume Arena
    │
    ▼
LED Processor / LED Wall / Output
```

In Resolume:

```text
Sources
   ↓
Spout
   ↓
D-Capture
```

The sender name can be configured as part of the native implementation.

Example:

```text
D-Capture
D-Capture-PPT
D-Capture-Desktop
D-Capture-Window
```

---

# Design Goals

D-Capture is being developed around several principles.

### Local First

The application should continue functioning without:

* Cloud streaming
* Wi-Fi
* Bluetooth
* Remote servers
* Internet-based rendering

### GPU First

Where possible:

```text
GPU → GPU
```

rather than:

```text
GPU → CPU → Memory → CPU → GPU
```

This is especially important for professional 4K/60 workflows.

### Predictable Output

The capture system should eventually support:

* Fixed resolution
* Fixed FPS
* Stable frame timing
* Low latency
* Consistent aspect ratio
* Direct GPU texture transfer

### Professional AV Workflow

The application is designed around real-world event production rather than browser-only screen sharing.

Typical applications include:

* LED walls
* Corporate events
* Concerts
* Conferences
* Live presentations
* VJ systems
* Media servers
* Event production
* Resolume Arena workflows

---

# Current Limitations

The current browser implementation has several limitations.

### Browser Capture

`getDisplayMedia()` requires user permission and browser interaction.

### Minimized Windows

True minimized-window capture requires a native Windows capture implementation.

### PPTX Rendering

The PPTX file renderer does not replace the full Microsoft PowerPoint rendering engine.

For exact PowerPoint rendering, including:

* animations
* transitions
* embedded video
* audio
* advanced effects
* PowerPoint-specific rendering

the recommended architecture is to capture the actual PowerPoint application window.

### Spout

Native Spout output is part of the planned Windows integration.

---

# Roadmap

## Phase 1 — Browser Engine

* [x] React interface
* [x] Local source system
* [x] PDF support
* [x] PPTX loading
* [x] Canvas compositor
* [x] Desktop capture workflow
* [x] Application capture workflow
* [ ] Improved error reporting
* [ ] Router not-found handling

## Phase 2 — Windows Capture

* [ ] Native Windows application
* [ ] Window enumeration
* [ ] Process enumeration
* [ ] HWND selection
* [ ] Monitor enumeration
* [ ] Windows Graphics Capture
* [ ] D3D11 texture acquisition

## Phase 3 — Spout

* [ ] Spout sender
* [ ] GPU texture sharing
* [ ] Dynamic sender names
* [ ] Resolution switching
* [ ] FPS control
* [ ] Resolume validation

## Phase 4 — Professional Capture

* [ ] Minimized application capture where supported
* [ ] PowerPoint live capture
* [ ] Chrome/Edge capture
* [ ] VLC capture
* [ ] Adobe application capture
* [ ] Multi-monitor capture
* [ ] 4K/60 optimization
* [ ] Low-latency pipeline

## Phase 5 — Production

* [ ] Windows installer
* [ ] Auto-start native service
* [ ] Crash recovery
* [ ] Capture diagnostics
* [ ] GPU capability detection
* [ ] Capture health monitoring
* [ ] Logging
* [ ] Production-safe configuration

---

# Development Philosophy

D-Capture should not attempt to force professional video workflows entirely through browser APIs.

The React application is the **control plane**.

The native Windows layer is the **capture plane**.

```text
┌──────────────────────────────┐
│       React / Vite UI        │
│                              │
│ Sources • Controls • Status  │
└──────────────┬───────────────┘
               │
               │ IPC
               ▼
┌──────────────────────────────┐
│    Native Windows Engine     │
│                              │
│ WGC • D3D11 • HWND • GPU     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│          Spout               │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Resolume Arena         │
└──────────────────────────────┘
```

This separation keeps the user interface flexible while allowing the capture engine to operate at the level required for professional AV work.

---

# Contributing

Contributions are welcome.

Before submitting a pull request:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Please keep changes focused and document any changes to the capture pipeline.

---

# License

Add the project's chosen license here.

Example:

```text
MIT License
```

If proprietary components such as Spout integrations or commercial dependencies are introduced, verify their respective licenses before redistribution.

---

# Status

**Development / Experimental**

D-Capture is actively being developed toward a professional Windows capture bridge for Resolume Arena.

The current web application provides the control and rendering foundation. Native Windows Graphics Capture, D3D11 GPU capture, and Spout integration are the next major steps toward the complete production architecture.

---

## Project Vision

> **D-Capture — Turn any local source into a professional live visual feed.**

Local files.
Live applications.
Desktop capture.
GPU processing.
Spout.
Resolume.

**One local capture pipeline for professional visual production.**
