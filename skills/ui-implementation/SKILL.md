---
name: ui-implementation
description: Plans, implements, and verifies UI components and screens with a coherent design system, comprehensive component states, accessibility (a11y), responsive layouts, and visual verification. Use for UI features, design systems, visual refinements, or styling fixes.
---

# UI & Frontend Engineering

Use this workflow to build polished, accessible, and responsive user interfaces that integrate seamlessly with the project's visual language.

## 1. Inspect Existing Visual Language First

1. **Audit Existing Components**: Review existing component libraries, styles, and CSS solutions (CSS Modules, Tailwind, styled-components, vanilla CSS). Never introduce an unapproved second styling framework or parallel design system.
2. **Review Design System Tokens**: Check `docs/ai-workflow/design-system.md` or existing stylesheets for predefined tokens:
   - **Color Palette**: Primary, neutral/surface, semantic (success, warning, error, info), and text hierarchy colors.
   - **Typography**: Font family, font sizes, line heights, and weights.
   - **Spacing & Radius Scale**: Standard padding, margins, gaps, and corner radiuses.
   - **Elevation & Borders**: Shadow levels, border widths, and divider colors.
3. **Understand User Intent**: Identify the primary task, visual hierarchy, and key interactive components required for the screen.

## 2. Comprehensive Component States

Every interactive component and view must handle all standard lifecycle states gracefully:
- **Default / Idle**: Clean, uncluttered layout with realistic copy (avoid repetitive lorem ipsum).
- **Hover & Active**: Subtle interactive feedback (color transitions, subtle scaling) to indicate clickability.
- **Focus-Visible**: High-contrast, non-obscured focus ring for keyboard navigators. Never remove `outline` without providing an accessible alternative.
- **Disabled**: Clear reduced-opacity or muted presentation with `aria-disabled="true"` or `disabled` attribute.
- **Loading / Skeleton**: Skeleton loaders, spinners, or shimmer placeholders while awaiting async data. Prevent cumulative layout shifts (CLS).
- **Empty State**: Informative illustration/icon, clear copy explaining why it is empty, and a primary call-to-action (CTA).
- **Error State**: Non-technical, actionable error message with retry mechanism and form field validation highlights.

## 3. Accessibility (a11y) & Semantic Structure

- **Semantic HTML5**: Use native `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`, `<button>`, `<input>`, and heading hierarchy (`h1` through `h6`).
- **Keyboard Navigation**: Ensure all interactive elements are reachable and operable via keyboard (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Esc`). Modals and drawers must trap focus while open and restore focus upon dismissal.
- **Color Contrast**: Maintain minimum WCAG 2.1 AA contrast ratios (4.5:1 for normal text, 3:1 for large text and UI components).
- **Screen Reader Support**: Provide descriptive `aria-label` or `aria-labelledby` for icon-only buttons. Add `alt` descriptions for images. Ensure form inputs have associated `<label>` elements.
- **Touch Targets**: Interactive controls must maintain a minimum bounding box of 44x44px for touch accessibility.

## 4. Responsive Layouts & Cross-Viewport Design

- Design mobile-first or fluidly adapt across breakpoints:
  - **Mobile** (< 640px): Single-column, stacked layout, bottom sheets or collapsible navigation, touch-friendly tap targets.
  - **Tablet** (640px - 1024px): 2-column or adaptable grid layouts.
  - **Desktop** (> 1024px): Multi-column layouts, sticky toolbars or sidebars.
- **Prevent Horizontal Overflow**: Ensure tables, code snippets, and long text strings wrap or provide dedicated scroll containers (`overflow-x: auto`).

## 5. Rendered Visual QA & Verification

1. Start the application locally using its documented run command (e.g. `npm run dev`).
2. Inspect rendered output using available browser tools, subagents, or screenshot tools.
3. Test layout at both wide (e.g. 1280px) and narrow (e.g. 375px) viewports.
4. Verify browser console: ensure no runtime exceptions, CSS parse warnings, or React key warnings occur.
5. **Truthful Reporting**: Document exact viewports tested and visual artifacts inspected. If browser tools are unavailable in the runtime environment, state this limitation clearly and provide manual verification steps for the user.
