# Video Quality Control (QC) & Delivery Checklist

> **Usage**: Pre-render and post-render validation checklist for programmatic video sequences and motion compositions. Verifies timing, visual hierarchy, audio balance, and technical delivery requirements.

---

## 1. Timing, Pacing & Narrative Checks

- [ ] **Hook Effectiveness**: The first 3 seconds communicate the core subject or hook without delay.
- [ ] **Scene Cuts**: Cuts and transitions land on intended beats, audio transients, or speech pauses.
- [ ] **Text Readability Pacing**: Every text overlay remains on screen long enough for comfortable reading (minimum 1 second per 3 words + 1 second base reading time).
- [ ] **No Blank Frames**: Verified that no empty or unrendered frames exist between scene transitions.
- [ ] **Total Frame Exactness**: Total duration in frames exactly equals $\text{Duration (seconds)} \times \text{FPS}$.

---

## 2. Visual Hierarchy, Typography & Safe Zones

- [ ] **Title Safe Area**: All critical copy, subtitles, and brand marks stay within the 90% inner safe area (clear of mobile/feed UI overlays).
- [ ] **Contrast & Legibility**: Text maintains high contrast against moving background elements (WCAG AA equivalent visual contrast).
- [ ] **Typography Hierarchy**: Font size scaling clearly differentiates primary headers from secondary supporting labels.
- [ ] **Focal Point Discipline**: Exactly one primary focal element draws visual attention per frame; secondary animations support rather than distract.
- [ ] **Motion Easing Consistency**: All object motion uses natural, non-linear easing curves (ease-out for entrances, ease-in for exits, spring physics where appropriate).
- [ ] **No Artifacts or Glitches**: No visual clipping, unintended layout shifts, or jagged vector scaling artifacts.

---

## 3. Audio & Synchronization Checks

- [ ] **Voiceover Clarity**: Spoken audio is crisp, understandable, and free of background noise or clipping.
- [ ] **Audio Ducking**: Background music volume drops by 12dB to 18dB during voiceover or dialog sections.
- [ ] **Sync Precision**: Keyframe visual accents (e.g. badge pop, button press) align to the exact frame of the corresponding sound effect or beat.
- [ ] **Loudness Standards**: Audio levels meet target streaming standards (e.g. -14 LUFS integrated for YouTube/Web, peak not exceeding -1.0 dBTP).
- [ ] **Audio Fadeout**: Outro music and ambient sound fade smoothly without abrupt audio cutoffs.

---

## 4. Technical Delivery & Export Specifications

- [ ] **Resolution & Dimensions**: Matches target delivery specs (e.g. 1920x1080 for 16:9, 1080x1920 for 9:16, 3840x2160 for 4K).
- [ ] **Aspect Ratio**: Correct pixel aspect ratio (1:1 square pixels).
- [ ] **Frame Rate (FPS)**: Constant frame rate matching project timeline (e.g. 30.00 FPS or 60.00 FPS; no variable frame rate).
- [ ] **Color Space**: Rec.709 / sRGB color profile for web delivery.
- [ ] **File Format & Codec**: Standard MP4 container with H.264 / AVC video codec and AAC stereo audio (or project-specified format).
- [ ] **File Size & Bitrate**: Bitrate appropriate for web streaming (e.g. 12-16 Mbps for 1080p60, 20-30 Mbps for 4K).

---

## 5. Tooling & Environment Verification Log

- **QC Review Date**: [YYYY-MM-DD]
- **Reviewer / Agent**: [Agent / Pair Programmer]
- **Rendering Engine Used**: [e.g. Remotion v4.0 / Offline FFmpeg / Motion Canvas / N/A (Storyboard Phase)]
- **Execution Output Log**: [Log exit code, render duration, and output file path]
- **Verification Status**: [PASS / CONDITIONAL PASS / PENDING ENGINE INTEGRATION]
- **Notes & Next Steps**: [Any remaining tasks before publication]
