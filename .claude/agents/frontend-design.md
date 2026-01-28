# GreenShoe Frontend Design System

> *"One Step At A Time"* — Confidence in motion, elegance in restraint.

This document guides the creation of GreenShoe's distinctive, production-grade frontend interface. Every screen, component, and interaction must reflect the quality of an agency that helps clients present their best digital selves.

**This is not an internal tool that looks internal. This is a professional platform that clients will see and judge us by.**

---

## Design Philosophy

### The GreenShoe Aesthetic

GreenShoe draws inspiration from Jordin Sparks stepping out in confident green platform heels — ready for anything, grounded yet elevated. Our interface embodies:

- **Confident Minimalism** — Not sparse, but intentional. Every element earns its place.
- **Grounded Elevation** — Subtle depth through shadows and layers, like a platform sole.
- **Warm Professionalism** — Approachable without being casual. Refined without being cold.
- **Progressive Motion** — Movement that feels like taking steps forward, never jarring.

### Tone Spectrum

```
Playful ●○○○○ Professional
Minimal ○○●○○ Maximalist
Organic ○○○●○ Geometric
Retro   ○○○○● Modern
```

GreenShoe sits at: **Refined Modern Minimalism with Organic Warmth**

---

## Typography

### Font Stack

```css
/* Display & Headings */
--font-display: 'Plus Jakarta Sans', system-ui, sans-serif;

/* Body & UI */
--font-body: 'DM Sans', system-ui, sans-serif;

/* Monospace (code, technical) */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Why These Fonts

- **Plus Jakarta Sans** — Geometric with subtle personality. The slightly rounded terminals feel confident yet approachable. Used for headlines and key moments.
- **DM Sans** — Clean, modern, excellent legibility. Warmer than Inter, more refined than system fonts. Our workhorse.
- **JetBrains Mono** — For any code, paths, or technical display. Ligatures optional.

### Type Scale

```css
--text-xs: 0.75rem;      /* 12px - Labels, captions */
--text-sm: 0.875rem;     /* 14px - Secondary text, table data */
--text-base: 0.875rem;   /* 14px - Body copy */
--text-lg: 1.125rem;     /* 18px - Lead paragraphs */
--text-xl: 1.25rem;      /* 20px - Card titles */
--text-2xl: 1.5rem;      /* 24px - Section headers */
--text-3xl: 1.875rem;    /* 30px - Page titles */
--text-4xl: 2.25rem;     /* 36px - Hero moments */
--text-5xl: 3rem;        /* 48px - Marketing/splash */
```

### Typography Rules

1. **Headlines** — Plus Jakarta Sans, Semi-bold (600) or Bold (700)
2. **Body** — DM Sans, Regular (400) or Medium (500)
3. **Line height** — 1.5 for body, 1.2 for headlines
4. **Letter spacing** — Slightly tighter (-0.01em) for headlines, normal for body
5. **Max line length** — 65-75 characters for readability

```css
/* Example heading treatment */
.page-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--color-text-primary);
}
```

---

## Color System

### Brand Palette

```css
:root {
  /* Primary - The GreenShoe Green */
  --color-primary: #22C55E;
  --color-primary-hover: #16A34A;
  --color-primary-light: #DCFCE7;
  --color-primary-muted: #86EFAC;

  /* Accent - Heel Tan (use sparingly) */
  --color-accent: #D4A574;
  --color-accent-light: #F5E6D3;

  /* Neutrals - Warm slate, not cold gray */
  --color-text-primary: #1E293B;
  --color-text-secondary: #64748B;
  --color-text-muted: #94A3B8;
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-border: #E2E8F0;
  --color-border-light: #F1F5F9;

  /* Status */
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;

  /* Dark Mode */
  --color-dark-bg: #0F172A;
  --color-dark-surface: #1E293B;
  --color-dark-surface-elevated: #334155;
  --color-dark-text: #F1F5F9;
  --color-dark-text-secondary: #94A3B8;
  --color-dark-border: #334155;
}
```

### Color Usage Rules

1. **Primary Green** — CTAs, success states, progress, active elements. This is our signature.
2. **Accent Tan** — Rarely. Illustrations, hover accents, special callouts. Adds warmth.
3. **Neutrals** — The foundation. Most of the interface is neutral with green punctuation.
4. **Never** — Purple gradients, neon accents, or "startup blue" (#4F46E5). We're not that.

### Color Ratios

```
Background/Surface:  70%
Text/Neutrals:       20%
Primary Green:        8%
Accent/Status:        2%
```

---

## Spatial System

### Spacing Scale

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
```

### Layout Principles

1. **Generous Whitespace** — Let elements breathe. Cramped = cheap.
2. **Consistent Rhythm** — Use the spacing scale religiously. No magic numbers.
3. **Asymmetric Interest** — Cards don't need to be identical sizes. Vary intentionally.
4. **Edge Alignment** — Elements should align to invisible grid lines. Misalignment looks amateur.

### Grid System

```css
/* Main layout */
.app-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

/* Content areas */
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-6);
}

/* Dashboard cards */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);
}
```

---

## Depth & Elevation

### Shadow Scale

```css
/* Subtle lift - cards at rest */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);

/* Default elevation - cards, dropdowns */
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);

/* Prominent - modals, popovers */
--shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.12);

/* Dramatic - hero cards, focus states */
--shadow-xl: 0 24px 48px rgba(0, 0, 0, 0.16);

/* Pressed state */
--shadow-pressed: 0 1px 2px rgba(0, 0, 0, 0.08);

/* Colored shadow for primary elements */
--shadow-primary: 0 4px 14px rgba(34, 197, 94, 0.25);
--shadow-primary-lg: 0 8px 24px rgba(34, 197, 94, 0.3);
```

### Elevation Hierarchy

```
Level 0: Background (--color-background)
Level 1: Surface cards (--shadow-sm)
Level 2: Interactive cards on hover (--shadow-md)
Level 3: Dropdowns, popovers (--shadow-lg)
Level 4: Modals, dialogs (--shadow-xl)
```

### Border Radius

```css
--radius-sm: 6px;     /* Buttons, inputs, chips */
--radius-md: 10px;    /* Cards, dropdowns */
--radius-lg: 14px;    /* Modals, large cards */
--radius-xl: 20px;    /* Hero elements, panels */
--radius-full: 9999px; /* Pills, avatars, toggles */
```

**Note:** Rounded corners are our signature — like the curve of a platform sole. Avoid sharp corners except for very small elements or intentional contrast.

---

## Motion & Animation

### Timing

```css
--duration-instant: 100ms;  /* Micro-feedback */
--duration-fast: 150ms;     /* Hovers, toggles */
--duration-normal: 300ms;   /* Most transitions */
--duration-slow: 500ms;     /* Page transitions, reveals */
--duration-slower: 700ms;   /* Orchestrated sequences */
```

### Easing

```css
/* Default - smooth and natural */
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);

/* Enter - elements appearing */
--ease-out: cubic-bezier(0, 0, 0.2, 1);

/* Exit - elements leaving */
--ease-in: cubic-bezier(0.4, 0, 1, 1);

/* Bounce - success moments, completion */
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Spring - playful interactions */
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### The "Step" Motion Language

GreenShoe animations should feel like confident steps forward:

```css
/* Page enter - step up into view */
@keyframes stepUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Success pulse - the satisfying step completion */
@keyframes stepComplete {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

/* Progress - walking forward */
@keyframes stepProgress {
  0% { transform: translateX(0); }
  50% { transform: translateX(4px) translateY(-2px); }
  100% { transform: translateX(8px); }
}

/* Stagger children */
.stagger-children > * {
  animation: stepUp var(--duration-normal) var(--ease-out) both;
}
.stagger-children > *:nth-child(1) { animation-delay: 0ms; }
.stagger-children > *:nth-child(2) { animation-delay: 50ms; }
.stagger-children > *:nth-child(3) { animation-delay: 100ms; }
.stagger-children > *:nth-child(4) { animation-delay: 150ms; }
.stagger-children > *:nth-child(5) { animation-delay: 200ms; }
```

### Animation Rules

1. **Purpose over decoration** — Every animation should communicate something.
2. **Stagger reveals** — Lists and grids should cascade, not pop all at once.
3. **Respond to interaction** — Hover, focus, and click should have immediate feedback.
4. **Respect preferences** — Honor `prefers-reduced-motion`.
5. **Progress feels like steps** — Loading indicators should "walk" forward.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Component Patterns

### Buttons

```css
/* Primary - Our signature green step forward */
.btn-primary {
  background: var(--color-primary);
  color: white;
  font-family: var(--font-body);
  font-weight: 500;
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-sm);
  border: none;
  box-shadow: var(--shadow-primary);
  transition: all var(--duration-fast) var(--ease-default);
  cursor: pointer;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  box-shadow: var(--shadow-primary-lg);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: var(--shadow-pressed);
}

/* Secondary - Understated but present */
.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.btn-secondary:hover {
  background: var(--color-background);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* Ghost - Minimal footprint */
.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
}

.btn-ghost:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
}
```

### Cards

```css
.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-sm);
  padding: var(--space-6);
  transition: all var(--duration-fast) var(--ease-default);
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-border);
}

.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Site card with status indicator */
.site-card {
  position: relative;
  overflow: hidden;
}

.site-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--color-primary);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--duration-normal) var(--ease-out);
}

.site-card:hover::before {
  transform: scaleX(1);
}
```

### Inputs

```css
.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition: all var(--duration-fast) var(--ease-default);
}

.input:hover {
  border-color: var(--color-text-muted);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.input::placeholder {
  color: var(--color-text-muted);
}

/* Input with icon */
.input-group {
  position: relative;
}

.input-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.input-with-icon {
  padding-left: var(--space-10);
}
```

### Status Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  font-weight: 500;
  border-radius: var(--radius-full);
}

.badge-success {
  background: var(--color-primary-light);
  color: var(--color-primary-hover);
}

.badge-warning {
  background: #FEF3C7;
  color: #D97706;
}

.badge-error {
  background: #FEE2E2;
  color: #DC2626;
}

.badge-neutral {
  background: var(--color-background);
  color: var(--color-text-secondary);
}

/* Animated status dot */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.status-dot-pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Progress Indicators

```css
/* Step progress bar - walking forward */
.progress-bar {
  height: 4px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width var(--duration-slow) var(--ease-out);
}

/* Step indicators */
.steps {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.step {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: var(--text-sm);
  font-weight: 500;
  border: 2px solid var(--color-border);
  color: var(--color-text-muted);
  transition: all var(--duration-fast) var(--ease-default);
}

.step-active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: white;
}

.step-complete {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.step-connector {
  flex: 1;
  height: 2px;
  background: var(--color-border);
}

.step-connector-active {
  background: var(--color-primary);
}
```

---

## Page Layouts

### Dashboard Layout

```css
.dashboard {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  background: var(--color-surface);
  border-right: 1px solid var(--color-border-light);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
}

.sidebar-logo {
  margin-bottom: var(--space-8);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all var(--duration-fast) var(--ease-default);
}

.nav-item:hover {
  background: var(--color-background);
  color: var(--color-text-primary);
}

.nav-item-active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 500;
}

/* Main content */
.main-content {
  background: var(--color-background);
  padding: var(--space-8);
  overflow-y: auto;
}

.page-header {
  margin-bottom: var(--space-8);
}

.page-title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.page-description {
  color: var(--color-text-secondary);
  font-size: var(--text-lg);
}
```

### Site Detail Layout

```css
.site-detail {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: var(--space-8);
}

.site-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.site-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
```

---

## Visual Flourishes

### Background Treatments

```css
/* Subtle grid pattern for empty states */
.bg-grid {
  background-image:
    linear-gradient(var(--color-border-light) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-border-light) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* Gradient fade for hero sections */
.bg-gradient-hero {
  background: linear-gradient(
    135deg,
    var(--color-primary-light) 0%,
    var(--color-background) 50%,
    var(--color-surface) 100%
  );
}

/* Subtle noise texture overlay */
.bg-noise::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
}
```

### Decorative Elements

```css
/* Corner accent */
.corner-accent {
  position: relative;
}

.corner-accent::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 60px;
  height: 60px;
  background: linear-gradient(
    135deg,
    transparent 50%,
    var(--color-primary-light) 50%
  );
  border-radius: 0 var(--radius-md) 0 0;
}

/* Glowing focus ring */
.focus-glow:focus {
  outline: none;
  box-shadow:
    0 0 0 2px var(--color-surface),
    0 0 0 4px var(--color-primary),
    0 0 20px rgba(34, 197, 94, 0.2);
}
```

---

## Dark Mode

```css
[data-theme="dark"] {
  --color-text-primary: #F1F5F9;
  --color-text-secondary: #94A3B8;
  --color-text-muted: #64748B;
  --color-background: #0F172A;
  --color-surface: #1E293B;
  --color-border: #334155;
  --color-border-light: #1E293B;

  /* Primary stays vibrant */
  --color-primary: #22C55E;
  --color-primary-light: rgba(34, 197, 94, 0.15);

  /* Shadows need adjustment */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.4);
}
```

---

## What We NEVER Do

### Banned Aesthetics

- **No purple-blue gradients** — The "AI startup" look
- **No Inter font** — Beautiful but overused
- **No flat gray (#9CA3AF)** — Use warm slate tones
- **No harsh shadows** — Keep them soft and subtle
- **No square corners on interactive elements**
- **No generic icons** — Choose distinctive ones or none
- **No cluttered dashboards** — Whitespace is confidence
- **No "dark mode" that's just inverted colors** — Thoughtfully designed

### Code Anti-patterns

```css
/* DON'T */
.bad-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: Inter, sans-serif;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* DO */
.good-button {
  background: var(--color-primary);
  font-family: var(--font-body);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-primary);
}
```

---

## Quality Checklist

Before shipping any UI:

- [ ] **Typography** — Using DM Sans/Plus Jakarta, correct weights, proper hierarchy?
- [ ] **Colors** — Using CSS variables, green as accent not flood, warm neutrals?
- [ ] **Spacing** — Consistent rhythm, generous whitespace, aligned edges?
- [ ] **Shadows** — Subtle, warm, creating depth not noise?
- [ ] **Borders** — Thin, light, rounded corners?
- [ ] **Motion** — Purposeful, fast, respecting preferences?
- [ ] **Accessibility** — Focus visible, contrast passing, keyboard navigable?
- [ ] **Responsive** — Works on all screen sizes, no horizontal scroll?
- [ ] **Dark mode** — Looks intentional, not inverted?
- [ ] **Empty states** — Designed, not just "No data"?
- [ ] **Loading states** — Skeletons or progress, not spinners?
- [ ] **Error states** — Helpful, not just red text?

---

## Implementation Notes

### Tailwind Configuration

When implementing with Tailwind, extend the config:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#22C55E',
          hover: '#16A34A',
          light: '#DCFCE7',
          muted: '#86EFAC',
        },
        accent: {
          DEFAULT: '#D4A574',
          light: '#F5E6D3',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
        md: '0 4px 12px rgba(0, 0, 0, 0.08)',
        lg: '0 12px 32px rgba(0, 0, 0, 0.12)',
        xl: '0 24px 48px rgba(0, 0, 0, 0.16)',
        primary: '0 4px 14px rgba(34, 197, 94, 0.25)',
        'primary-lg': '0 8px 24px rgba(34, 197, 94, 0.3)',
      },
    },
  },
}
```

### React Component Structure

```tsx
// Follow this pattern for consistency
export function SiteCard({ site }: { site: Site }) {
  return (
    <motion.div
      className="card card-interactive site-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
    >
      {/* Content */}
    </motion.div>
  );
}
```

---

## The GreenShoe Standard

Every pixel we ship represents our agency. When a client logs into GreenShoe, they should feel:

1. **"This is premium"** — The polish signals we care about quality
2. **"This is easy"** — Clear hierarchy, obvious actions
3. **"This is trustworthy"** — Professional, not flashy
4. **"I'm in good hands"** — Confident design = confident agency

**One Step At A Time. Every step polished.**
