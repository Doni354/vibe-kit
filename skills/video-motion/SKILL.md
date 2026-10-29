---
name: video-motion
description: Plans, structures, and reviews programmatic motion graphics, video sequences, and timeline compositions. Governs brief analysis, storyboard narrative, frame-accurate scene timing, visual hierarchy, motion principles, asset inventory, audio sync, and export quality control without depending on specific rendering engines.
---

# Video & Motion Role Workflow

Use this workflow to design, structure, plan, and verify programmatic video compositions, animations, and motion graphics. This workflow is **engine-independent**: it defines the universal creative and structural disciplines of video production (timing, storyboards, pacing, asset provenance, visual hierarchy, audio synchronization, and quality control) independently of any specific rendering technology.

## When to Use
- Planning and scripting programmatic video sequences, product demos, social video snippets, or animated explainers.
- Creating narrative outlines, scene breakdowns, and frame-accurate timeline plans.
- Defining typography scales, color palettes, visual composition, and motion easing for video.
- Managing video asset inventories, audio tracks, voiceover cues, and asset licenses.
- Conducting pre-render quality control and post-render delivery validation.

## When NOT to Use
- Developing static web frontend UI components or forms (use `ui-implementation`).
- Building backend APIs, database models, or server logic (use `backend-feature`).
- Coordinating cross-layer client-server integration features (use `fullstack-integration`).

---

## Required Inputs
1. **Creative Brief & Audience**: Objective, target platform (e.g. YouTube 16:9, TikTok/Reels 9:16, Web Hero), target duration, and core message.
2. **Technical Output Specifications**: Target resolution (e.g. 1920x1080, 1080x1920, 3840x2160), frame rate (e.g. 30 FPS, 60 FPS), aspect ratio, and delivery format (e.g. MP4/H.264).
3. **Asset & Brand Inventory**: Logos, illustrations, typography, audio tracks, and color guidelines.

## Expected Outputs
1. Completed Video Brief & Storyboard in `docs/ai-workflow/storyboard.md`.
2. Frame-accurate scene breakdown table with timecodes, visuals, motion transitions, and audio cues.
3. Asset inventory with verified sources, licensing, and file paths.
4. Pre-render and delivery validation documented via `docs/ai-workflow/video-qc-checklist.md`.
5. Transparent execution status: clear distinction between planned timeline structure and currently installed local rendering capabilities.

---

## Actionable Execution Procedure

### Step 1: Creative Brief & Audience Analysis
1. Define the primary objective: What is the single takeaway message?
2. Identify the target audience and viewing context:
   - Platform destination: Mobile feed (sound off by default, vertical 9:16), desktop/TV (horizontal 16:9), or square feed (1:1).
   - Hook window: First 3 seconds must immediately communicate the topic and grab attention.
3. Establish total target duration (e.g. 15s teaser, 60s product overview, 120s walkthrough) and calculate total frame budget:
   $$\text{Total Frames} = \text{Duration (seconds)} \times \text{FPS}$$

### Step 2: Narrative Structure & Storyboarding
1. Structure the narrative arc using classic pacing principles:
   - **Hook (0-15%)**: Immediate visual disruption, core question, or statement.
   - **Setup & Problem (15-35%)**: Establish context and user friction point.
   - **Solution / Feature Showcase (35-75%)**: Clear demonstration of capability or value proposition.
   - **Climax / Payoff (75-90%)**: The key outcome, benchmark, or transformation.
   - **Call-to-Action (CTA) & Outro (90-100%)**: Clear next step, brand logo, and URL.
2. Document the narrative outline in `docs/ai-workflow/storyboard.md`.

### Step 3: Frame-Accurate Scene Breakdown & Timeline Planning
1. Break down the timeline into discrete scenes or sequence blocks.
2. For each scene, document in `docs/ai-workflow/storyboard.md`:
   - **Scene ID & Name**: Unique identifier (e.g. `Scene_01_Hook`).
   - **Timecode Range**: Start and end timestamps in `MM:SS:FF` and corresponding frame range (e.g. frames `0` to `90` at 30 FPS = `00:00:00` - `00:03:00`).
   - **Visual Description**: Camera perspective, background, visual elements, focal subject.
   - **Text Overlays**: Exact on-screen copy, font size hierarchy, and positioning.
   - **Motion & Transitions**: Entrance animation, internal camera motion, and exit transition (e.g. smooth cross-dissolve, directional wipe, or hard cut).
   - **Audio / Voiceover Cue**: Specific spoken words or music beats that anchor visual events.

### Step 4: Typography, Composition & Visual Hierarchy
1. **Safe Title Zones**: Keep all critical text and logos within the 90% inner safe area (avoid platform UI overlays like captions, profile icons, and like buttons).
2. **Text Readability & Pacing**:
   - Calculate reading time: Allow minimum 1 second per 3 words of on-screen text, plus 1 second base reading time.
   - High contrast between text and animated backgrounds (use subtle drop-shadows, scrims, or backdrop overlays).
3. **Visual Hierarchy**: Exactly one primary focal point per frame. Secondary elements must not compete for attention.

### Step 5: Motion Principles & Easing Consistency
1. Apply consistent physics and easing across the entire composition:
   - Use natural easing curves (e.g. `cubic-bezier` ease-out for entrances, ease-in for exits, smooth spring physics). Avoid linear interpolation for organic movement.
   - Keep transition durations snappy (typically 200ms - 450ms / 6 to 15 frames at 30 FPS) so pacing remains brisk.
2. Maintain motion continuity: maintain directional momentum across scene cuts (e.g. element exiting right is followed by element entering from left).

### Step 6: Asset Inventory & Provenance
1. Catalog all external media in the storyboard documentation:
   - Vector graphics (SVG, AI, EPS).
   - Raster imagery (high-resolution PNG with transparency, JPEG).
   - Audio files (WAV / MP3 voiceover, background music, sound effects).
   - Fonts (licensed web fonts or system fonts).
2. Verify licensing, resolution (minimum 2x target output resolution to prevent pixelation during scale/zoom), and asset file existence before composition.

### Step 7: Audio Requirements, Sourcing & Synchronization
1. Map audio layers:
   - **Voiceover / Speech**: Primary audio track driving timeline pacing.
   - **Background Music**: Sets mood and energy; duck music volume by 12dB - 18dB during spoken sections.
   - **Sound Effects (SFX)**: Accents and whooshes anchored to keyframe peaks of major visual transitions.
2. Align cuts to musical transients or speech pauses for natural audiovisual synchronization.

### Step 8: Execution Capabilities & Tooling Boundaries
1. **Critical Tooling Transparency**:
   - Programmatic video rendering requires specialized rendering engines (such as Remotion, Manim, or Motion Canvas) or video toolchains (such as FFmpeg).
   - If rendering engines or audio synthesis providers are not installed or supported in the current project environment:
     - Clearly state the current environment capabilities and limitations.
     - Never pretend a video has been rendered if only configuration or mock code was written.
     - Provide the concrete storyboard specification in `docs/ai-workflow/storyboard.md` and verifiable code structure that can be executed once the engine is configured.

### Step 9: Quality Control & Delivery Checklist
1. Review the composition against `docs/ai-workflow/video-qc-checklist.md`:
   - Frame timing: No frozen frames or abrupt visual dropouts.
   - Readability: All copy is legible and displays long enough to read comfortably.
   - Audio: Clear voiceover, balanced music levels, no clipping or harsh cutoffs.
   - Specifications: Accurate resolution, frame rate, aspect ratio, and codec.
2. Document verified checklist items and deliverable status.
