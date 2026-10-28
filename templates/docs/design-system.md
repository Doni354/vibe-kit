# Design System & UI Specifications

> **Usage**: Capture established design tokens, typography, component states, responsive breakpoints, and accessibility criteria. Do not invent a new visual language if one already exists in the project.

## 1. Visual Direction & Target Audience
- **Target Audience**: [e.g. Enterprise dashboard users, Mobile consumer shoppers]
- **Primary Design Reference**: [e.g. Existing app screens in src/components, or Figma design link]
- **Visual Tone**: [e.g. Clean, minimalist, data-dense, high-contrast]

## 2. Design Tokens

### Color Palette
| Token Name | CSS Variable / Value | Purpose & Usage |
|---|---|---|
| `color-primary` | [e.g. #2563EB / hsl(221, 83%, 53%)] | Primary brand action, buttons, links |
| `color-surface` | [e.g. #FFFFFF / #0F172A (dark)] | Card and container background |
| `color-background`| [e.g. #F8FAFC / #020617 (dark)] | Base page background |
| `color-text-main` | [e.g. #0F172A / #F8FAFC (dark)] | High-contrast body text |
| `color-text-muted`| [e.g. #64748B / #94A3B8 (dark)] | Secondary text, captions, timestamps |
| `color-error`     | [e.g. #DC2626 / hsl(0, 72%, 51%)] | Validation errors, destructive actions |

### Typography & Spacing
- **Font Family**: [e.g. Inter, system-ui, sans-serif]
- **Scale**: [e.g. xs: 12px, sm: 14px, base: 16px, lg: 18px, xl: 20px, 2xl: 24px]
- **Spacing Unit**: [e.g. 4px base unit (4px, 8px, 12px, 16px, 24px, 32px)]
- **Corner Radius**: [e.g. sm: 4px, md: 8px, lg: 12px, full: 9999px]

## 3. Core Component States Checklist
Ensure every interactive component implements the following states:
| Component | Default | Hover | Focus-Visible | Active | Disabled | Loading / Skeleton | Error / Invalid |
|---|---|---|---|---|---|---|---|
| Button | [x] | [x] | [x] | [x] | [x] | [x] | N/A |
| Text Input | [x] | [x] | [x] | N/A | [x] | N/A | [x] |
| Modal Dialog | [x] | N/A | Focus Trap | N/A | N/A | [x] | N/A |

## 4. Responsive Viewports & Breakpoints
- **Mobile** (`< 640px`): Single column layout, touch target $\ge 44\times 44\text{px}$, bottom sheets or hamburger navigation.
- **Tablet** (`640px - 1024px`): 2-column grid, responsive cards, collapsible sidebars.
- **Desktop** (`> 1024px`): Multi-column layouts, persistent navigation, fixed or sticky headers.

## 5. Accessibility (a11y) & Visual QA
- **Contrast**: Minimum WCAG 2.1 AA ratio (4.5:1 for body text, 3:1 for large text/icons).
- **Keyboard**: Full navigation using `Tab`, `Shift+Tab`, `Enter`, `Space`, `Esc`.
- **Screen Reader**: Meaningful `aria-label` on icon buttons, `<label>` on all inputs.
- **Verification Viewports Tested**: [e.g. Desktop 1280x800, Mobile 375x667]
