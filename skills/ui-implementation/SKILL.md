---
name: ui-implementation
description: Plans, implements, and verifies frontend UI components, responsive screens, and design systems. Enforces component lifecycle states, accessibility (a11y), visual hierarchy, and project-specific styling conventions without unnecessary redesigns.
---

# Frontend Role Workflow

Use this workflow to design, implement, and verify accessible, responsive, and robust user interface features across any frontend framework or technology stack.

## When to Use
- Implementing new UI components, pages, forms, or views.
- Refactoring, restyling, or refining existing user interfaces.
- Integrating or extending a project's design system and tokens.
- Fixing responsive layout bugs, accessibility violations, or UI state defects.

## When NOT to Use
- Implementing backend APIs, database schemas, or server routes (use `backend-feature`).
- Coordinating cross-layer contracts between client and server (use `fullstack-integration`).
- Designing programmatic timeline video compositions (use `video-motion`).

---

## Required Inputs
1. **User Requirement & Acceptance Criteria**: What the user wants to accomplish and specific visual/functional expectations.
2. **Existing UI Baseline**: Project styling stack, component library, design tokens, and existing layouts.
3. **Target Routes / Viewports**: Applicable screen sizes and interaction contexts.

## Expected Outputs
1. UI implementation matching project styling idioms and design tokens.
2. Complete handling of all standard lifecycle states (idle, hover, active, focus, disabled, loading, empty, success, error).
3. Responsive behavior adhering to WCAG 2.1 AA accessibility standards.
4. Truthful verification summary using project test runners or dev tools.

---

## Actionable Execution Procedure

### Step 1: Understand Requirements & Avoid Unnecessary Redesigns
1. Clarify user requirements, scope boundaries, and acceptance criteria.
2. Review existing design references, mockups, or issue descriptions.
3. **Respect Existing UI**: Never redesign unrequested views or alter working layouts solely for aesthetic preference. Visual polish must serve requirements, not override them.

### Step 2: Inspect Framework, Component Hierarchy & Design Tokens
1. Inspect `package.json` or project manifests to identify the active frontend framework (React, Vue, Svelte, Angular, Flutter, etc.) and styling technology (CSS Modules, Tailwind, styled-components, Sass, vanilla CSS).
2. Check `docs/ai-workflow/design-system.md` or existing stylesheets for established design tokens:
   - **Color Palette**: Primary, neutral/surface, semantic (success, warning, error, info), and text colors.
   - **Typography**: Font families, type scales, line heights, and font weights.
   - **Spacing & Radius**: Standard scale for margins, padding, gaps, and border radii.
   - **Elevation**: Shadow levels, border widths, and divider treatments.
3. Never introduce an unapproved second styling framework or conflicting token system.

### Step 3: Plan Implementation Before Editing
1. Break down the UI into composable components (container, presentation, controls).
2. Identify reusable existing components (buttons, modals, inputs, badges) before creating new ones.
3. Outline state management: local component state vs shared global store, routing parameters, and URL search params.
4. Document the planned file modifications in `docs/ai-workflow/plan.md` if significant.

### Step 4: Component Implementation & State Completeness
Implement the component handling all required lifecycle states:
- **Idle / Default**: Clean layout with authentic sample data (avoid repetitive dummy text).
- **Hover & Active**: Clear interactive feedback for pointer devices (cursor pointer, subtle background or scale shift).
- **Focus-Visible**: High-contrast, non-obscured focus ring for keyboard navigation (`:focus-visible`). Never suppress outline without providing an accessible replacement.
- **Disabled**: Reduced opacity or muted contrast with `disabled` attribute or `aria-disabled="true"`.
- **Loading / Skeleton**: Skeleton placeholders or spinners during asynchronous data fetching to eliminate Cumulative Layout Shift (CLS).
- **Empty State**: Clear informative message, iconography, and an actionable primary call-to-action (CTA).
- **Success State**: Immediate affirmative feedback (toast, banner, or inline confirmation).
- **Error State**: Actionable, human-readable error messages with retry buttons and field validation indicators.

### Step 5: Accessibility (a11y) & Semantic Markup
1. **Semantic HTML5**: Use `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`, `<button>`, `<input>`, and a logical heading hierarchy (`h1` through `h6`).
2. **Keyboard Operability**:
   - Ensure all controls can be reached with `Tab` / `Shift+Tab` and triggered with `Enter` / `Space`.
   - Modals and dialogs must trap focus while open and restore focus to trigger element on close (`Esc` key support).
3. **Color Contrast**: Verify minimum contrast ratios (4.5:1 for normal body text, 3:1 for large text and interactive UI borders) per WCAG 2.1 AA.
4. **Assistive Technologies**: Provide `aria-label` or `aria-labelledby` for icon-only buttons, `alt` attributes for images, and explicit `<label for="...">` associations for form controls.
5. **Touch Targets**: Maintain minimum touch target size of 44x44px for touch interfaces.

### Step 6: Responsive Layouts & Cross-Viewport Design
1. Ensure layouts adapt cleanly across screen widths:
   - **Mobile** (< 640px): Single-column stacked layouts, bottom sheets or collapsible navigation, touch-friendly tap targets.
   - **Tablet** (640px - 1024px): 2-column or adaptive grid layouts.
   - **Desktop** (> 1024px): Multi-column layouts, persistent navigation sidebars.
2. **Prevent Horizontal Overflow**: Use `overflow-x: auto` for large data tables, code snippets, or preformatted blocks.

### Step 7: Verification & Testing
1. Run local linting, type-checking, and frontend unit/component tests (e.g. `npm test`, `npm run lint`, `tsc --noEmit`).
2. If a local development server is running and browser testing tools (e.g. Chrome DevTools, subagent browser) are available:
   - Test layout at desktop (e.g. 1280px) and mobile (e.g. 375px) viewports.
   - Inspect console logs for React key warnings, hydration errors, or unhandled exceptions.
3. If automated browser tools are unavailable in the execution environment, state the limitation clearly and provide exact manual verification instructions.

### Step 8: Reporting & Documentation
1. Summarize files added, modified, or styled.
2. Update `docs/ai-workflow/design-system.md` if new reusable tokens or component patterns were introduced.
3. Report verification results, pass/fail status, and any remaining UI edge cases.
