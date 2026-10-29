# Video Brief & Storyboard Plan

> **Usage**: Plan programmatic video compositions, narrative arcs, frame-accurate scene breakdowns, and asset inventories. Engine-independent document applicable to any video or motion project.

---

## 1. Video Brief & Specifications

| Property | Value / Specification | Notes |
|---|---|---|
| **Project Title** | [e.g. Vibe Kit Product Demo] | Working title |
| **Primary Goal** | [e.g. Introduce modular workflow packs in 60 seconds] | Core objective |
| **Target Audience** | [e.g. AI-assisted software engineers, dev leads] | Viewing context & expectations |
| **Target Platform** | [e.g. YouTube (16:9), TikTok / Reels (9:16), Twitter / X] | Placement & feed behavior |
| **Duration & FPS** | [e.g. 60s @ 30 FPS = 1800 total frames] | Frame budget: Duration × FPS |
| **Output Resolution** | [e.g. 1920x1080 (FHD), 1080x1920 (Vertical), 3840x2160 (4K)] | Dimensions |
| **Aspect Ratio** | [e.g. 16:9, 9:16, 1:1] | Canvas format |
| **Audio Format** | [e.g. 48kHz Stereo AAC, -14 LUFS integrated loudness] | Sound target |

---

## 2. Narrative Arc Outline

> *Note: The narrative arc breakdown below represents an example 60s explainer structure. Percentages and time intervals are customizable defaults—adapt duration, pacing, and sections to your specific project brief.*

- **00:00 - 00:05 (Hook / 0-10% example)**: [Visual hook and problem statement; grabs immediate attention]
- **00:05 - 00:18 (Context & Problem / 10-30% example)**: [Establishes current developer friction and pain point]
- **00:18 - 00:45 (Solution & Feature Demonstration / 30-75% example)**: [Step-by-step showcase of core capabilities]
- **00:45 - 00:55 (Results & Benchmark / 75-90% example)**: [Outcome metrics, consistency improvement, speed gain]
- **00:55 - 01:00 (Call-to-Action & Outro / 90-100% example)**: [Logo lockup, URL, and explicit next step]

---

## 3. Frame-Accurate Scene Breakdown

> *Note: Timecodes use `MM:SS:FF` at 30 FPS as a standard reference example. Calibrate frame rate (e.g. 24, 30, or 60 FPS) and notation to your rendering pipeline.*

| Scene ID | Timecode (MM:SS:FF) | Frames | Visual Elements & Composition | On-Screen Text / Typography | Motion & Transitions | Audio / Voiceover Cue |
|---|---|---|---|---|---|---|
| `SC_01` | `00:00:00 - 00:04:15` | `0 - 135` | [Dark canvas, animated glowing terminal icon centered] | "Stop wrestling with generic AI instructions." (Heading XL, 64px, White) | Scale up 0.9 -> 1.0 with smooth ease-out (30f); exit hard cut | VO: "Ever feel like your AI coding assistant forgets your project conventions?" |
| `SC_02` | `00:04:15 - 00:12:00` | `135 - 360` | [Split screen: messy fragmented folders vs organized packs] | "Modular Role Packs for Every Workflow" (48px) | Directional slide-in from left/right; spring damping 14 | VO: "Meet Vibe Kit: structured workflows tailored to frontend, backend, and fullstack." |
| `SC_03` | `00:12:00 - 00:25:00` | `360 - 750` | [Code editor mockup with interactive CLI command output] | "Deterministic. Safe. Zero Configuration Drift." (36px Accent Color) | Staggered fade & slide up (20f per card) | Music: Beat drop; VO: "One CLI command configures your entire workspace." |
| `SC_04` | `00:25:00 - 00:30:00` | `750 - 900` | [Minimalist brand logo centered, GitHub star badge] | "github.com/doni354/vibe-kit" (32px Mono font) | Gentle pulse zoom 1.0 -> 1.04; fade to black (15f) | VO: "Elevate your AI development today." Audio: Final chord fade |

---

## 4. Asset Inventory & Provenance

| Asset Name | Type | Source / Relative Path | Resolution / Format | License / Provenance |
|---|---|---|---|---|
| `logo-vibe-kit.svg` | Vector Graphic | `assets/brand/logo.svg` | Vector (Infinite scale) | Project owned |
| `bg-ambient-dark.png` | Background Image | `assets/images/bg-ambient.png` | 3840x2160 PNG | Self-created / Royalty-free |
| `voiceover-main.wav` | Audio (Speech) | `assets/audio/vo-track-v1.wav` | 48kHz 24-bit PCM WAV | Human voice / AI TTS licensed |
| `music-ambient-beat.mp3` | Audio (Music) | `assets/audio/music-track.mp3` | 320kbps MP3 (120 BPM) | Creative Commons / Licensed |
| `Inter-Bold.woff2` | Font Asset | `assets/fonts/Inter-Bold.woff2` | Web Font | SIL Open Font License |

---

## 5. Execution Environment & Tooling Notes

- **Planned Rendering Toolchain**: [e.g. Remotion v4, Manim Community, Motion Canvas, FFmpeg, or Manual Animation]
- **Current Workspace Status**: [State whether the rendering engine is currently installed or if this is an architectural planning document]
- **Preview & Validation Strategy**: [e.g. Browser player dev server, frame export inspection, or code compilation check]
