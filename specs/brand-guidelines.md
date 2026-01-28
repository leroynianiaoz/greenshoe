# GreenShoe Brand Guidelines

**Version**: 1.0
**Last Updated**: January 2026

---

## Brand Story

The name **GreenShoe** comes from Jordin Sparks' song "One Step At A Time." In the music video, she steps out of her apartment wearing bright green platform heels — ready to tackle life, ready to accept it all, letting it be, knowing she's ready for whatever happens.

This philosophy perfectly captures our approach to website staging and deployment:
- **Methodical progress** — one step at a time
- **Confidence** — ready for anything
- **Careful preparation** — look before you leap
- **Graceful recovery** — if you stumble, step back and try again

---

## Logo

### Primary Logo
The GreenShoe logo is a stylized letter "G" that subtly incorporates the silhouette of a platform heel. It should be recognizable as a "G" at first glance, with the shoe reference apparent to those who know the story.

### Logo Specifications
- **Style**: Stylized "G" as heel silhouette
- **Color**: Single color — Primary Green (#22C55E)
- **Clear space**: Minimum padding equal to the height of the heel portion
- **Minimum size**: 24px height for digital, 0.5" for print

### Logo Usage
| Context | Version |
|---------|---------|
| Light backgrounds | Green logo |
| Dark backgrounds | White logo |
| Favicon | Green "G" on transparent |
| App icon | White "G" on green background |

### Logo Don'ts
- Don't stretch or distort
- Don't add effects (shadows, gradients, outlines)
- Don't change the color (except white for dark backgrounds)
- Don't rotate or flip
- Don't place on busy backgrounds without sufficient contrast

---

## Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **GreenShoe Green** | `#22C55E` | 34, 197, 94 | Primary brand, CTAs, success states, links |
| **Heel Tan** | `#D4A574` | 212, 165, 116 | Warm accent, secondary highlights |

### Neutral Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Navy** | `#1E293B` | 30, 41, 59 | Primary text, headings |
| **Pavement** | `#64748B` | 100, 116, 139 | Secondary text, borders |
| **Soft White** | `#F8FAFC` | 248, 250, 252 | Light mode backgrounds, cards |
| **Step Shadow** | `#0F172A` | 15, 23, 42 | Dark mode background |

### Status Colors

| State | Hex | Usage |
|-------|-----|-------|
| **Success** | `#22C55E` | Operations complete, confirmations |
| **Warning** | `#F59E0B` | Cautions, live site changes detected |
| **Error** | `#EF4444` | Failures, validation errors |
| **Info** | `#3B82F6` | Informational messages, tips |

### Color Application

```css
:root {
  /* Primary */
  --color-primary: #22C55E;
  --color-primary-hover: #16A34A;
  --color-primary-light: #DCFCE7;
  --color-accent: #D4A574;

  /* Neutral */
  --color-text-primary: #1E293B;
  --color-text-secondary: #64748B;
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-border: #E2E8F0;

  /* Dark mode */
  --color-dark-background: #0F172A;
  --color-dark-surface: #1E293B;
  --color-dark-text: #F1F5F9;

  /* Status */
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;
}
```

---

## Typography

### Font Family
**Primary**: DM Sans or Plus Jakarta Sans

Both fonts convey confidence with warmth — professional yet approachable.

```css
font-family: 'DM Sans', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Type Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 | 32px / 2rem | 700 (Bold) | 1.2 |
| H2 | 24px / 1.5rem | 600 (Semibold) | 1.25 |
| H3 | 20px / 1.25rem | 600 (Semibold) | 1.3 |
| H4 | 16px / 1rem | 600 (Semibold) | 1.4 |
| Body | 14px / 0.875rem | 400 (Regular) | 1.5 |
| Small | 12px / 0.75rem | 400 (Regular) | 1.5 |
| Caption | 11px / 0.6875rem | 500 (Medium) | 1.4 |

### Font Weights
- **Regular (400)**: Body text, descriptions
- **Medium (500)**: Labels, captions, emphasis
- **Semibold (600)**: Subheadings, buttons
- **Bold (700)**: Page titles, important callouts

---

## Voice & Tone

### Brand Personality
- **Confident** — We know what we're doing
- **Supportive** — We're here to help you succeed
- **Calm** — Even when things go wrong, we've got it covered
- **Warm** — Professional but not cold

### Writing Principles

1. **Use "step" metaphors naturally** — Don't force them, but embrace them when they fit
2. **Be encouraging** — Guide users forward with positivity
3. **Stay calm during errors** — Never blame the user, offer solutions
4. **Keep it concise** — Respect users' time

### Microcopy Library

#### Pull Operations (Stepping In)
| State | Copy |
|-------|------|
| Pull button | "Take the first step" |
| Evaluation starting | "Sizing up the path ahead..." |
| Evaluation complete | "Here's what we're working with" |
| Questionnaire intro | "Let's plan your approach" |
| Pull starting | "Stepping in..." |
| Pull in progress | "Walking through the site..." |
| Downloading assets | "Gathering what you need..." |
| Pull complete | "You've arrived at staging" |
| Pull failed | "Stumbled — let's try again" |

#### Push Operations (Stepping Out)
| State | Copy |
|-------|------|
| Push button | "Ready to go live?" |
| Diff view button | "See where you've been" |
| Push confirmation | "One final step" |
| Push starting | "Stepping out to live..." |
| Push in progress | "Making your mark..." |
| Creating backup | "Leaving breadcrumbs..." |
| Push complete | "Safe landing!" |
| Push failed | "Misstep — rolling back" |
| Rollback in progress | "Stepping back..." |
| Rollback complete | "Back on solid ground" |

#### Archives & History
| State | Copy |
|-------|------|
| Archives section title | "Footprints" |
| View archive | "Retrace your steps" |
| Restore archive | "Walk back to this point?" |
| Restore complete | "Back to familiar ground" |
| No archives | "No footprints yet" |

#### Staging Site States
| State | Copy |
|-------|------|
| Never pulled | "Ready to take the first step" |
| Pulling | "Finding your footing..." |
| Pending review | "Check your landing" |
| Active/Ready | "Standing tall" |
| Pushing | "Stepping forward..." |
| Error | "Watch your step" |

#### Download/Upload (Local Editing)
| State | Copy |
|-------|------|
| Download button | "Take it with you" |
| Download complete | "Ready to walk your own path" |
| Upload button | "Bring it back" |
| Upload complete | "Welcome back" |

#### Notifications
| Type | Pattern |
|------|---------|
| Success | "✓ [Site]: Landed safely" |
| Warning | "⚠ [Site]: Watch your step" |
| Error | "✗ [Site]: Stumbled" |
| Info | "→ [Site]: Next step ready" |

#### Empty States
| Context | Copy |
|---------|------|
| No sites | "No paths yet. Add your first site to begin." |
| No operations | "No journeys recorded" |
| No notifications | "All clear ahead" |

#### Form Labels
Use conversational language:
- "What should we call this site?" (Site Name)
- "Where does this site live?" (Live URL)
- "How do we get in?" (Credentials)

#### Progress Messages (Rotating)
- "One step at a time..."
- "Making progress..."
- "Almost there..."
- "Just a few more steps..."
- "Steady pace..."

---

## UI Design

### Spacing Scale

Based on 4px increments, favoring measured "steps":

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight gaps |
| `--space-2` | 8px | Small step |
| `--space-3` | 12px | Compact |
| `--space-4` | 16px | Comfortable stride |
| `--space-6` | 24px | Relaxed |
| `--space-8` | 32px | Generous |
| `--space-12` | 48px | Section breaks |

### Border Radius

Rounded corners reflect the platform shoe aesthetic — soft curves like the toe of a platform sole:

| Element | Radius |
|---------|--------|
| Buttons, Inputs | 6px |
| Cards, Dropdowns | 10px |
| Large Cards, Modals | 14px |
| Hero Elements, Panels | 20px |
| Pills/Tags | 9999px (full round) |

```css
:root {
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-full: 9999px;
}
```

### Shadows

Shadows create grounding, like standing on pavement. Subtle at rest, dramatic when elevated:

```css
:root {
  /* Subtle lift - cards at rest */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);

  /* Default elevation - cards, dropdowns */
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);

  /* Prominent - modals, popovers */
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.12);

  /* Dramatic - hero cards, focus states */
  --shadow-xl: 0 24px 48px rgba(0, 0, 0, 0.16);

  /* Active/pressed - foot down */
  --shadow-pressed: 0 1px 2px rgba(0, 0, 0, 0.08);

  /* Colored shadow for primary elements */
  --shadow-primary: 0 4px 14px rgba(34, 197, 94, 0.25);
  --shadow-primary-lg: 0 8px 24px rgba(34, 197, 94, 0.3);
}
```

### Button Hierarchy

| Level | Style | Example Use |
|-------|-------|-------------|
| Primary | Green filled | "Take the first step", "Push to Live" |
| Secondary | Green outline | "Preview changes", "View diff" |
| Tertiary | Text only | "Cancel", "Go back" |
| Danger | Red outline | "Delete site", destructive actions |

### Status Badges

| Status | Color | Icon Suggestion |
|--------|-------|-----------------|
| Never Pulled | Gray | Empty footprint outline |
| Pulling | Green + pulse | Walking animation |
| Pending Review | Amber | Footprint with checkmark |
| Active | Green | Solid footprint |
| Pushing | Green + pulse | Arrow + footprint |
| Error | Red | Footprint with X |

---

## Illustrations

### Style
**Simple line art** — elegant, understated, not overly playful.

### Guidelines
- Use brand green (#22C55E) as primary color
- Single-weight strokes (2px recommended)
- Minimal detail — suggest rather than show
- Include shoe/footprint motifs where natural

### Key Illustrations Needed
1. **Empty dashboard** — Green shoes on pavement, path stretching ahead
2. **Success state** — Single confident footprint
3. **Error state** — Stumble/recovery motion
4. **Loading** — Walking feet animation
5. **Onboarding** — Step-by-step path

---

## Animation

### Principles
- **Confident, not rushed** — movements should feel deliberate
- **Grounded** — elements should feel like they have weight
- **One step at a time** — stagger animations when appropriate

### Timing
```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Step Animation (Success)
1. Element scales down slightly (foot lifting): 50ms
2. Small bounce up: 100ms
3. Settles down with slight overshoot: 150ms
4. Rests (grounded): 100ms

### Progress Indicators
Instead of smooth fills, progress advances in "steps":
- Jumps in 5% increments
- Tiny pause between each (50ms)
- Feels like measured progress

### Page Transitions
- **Enter**: Slide up from bottom (stepping up)
- **Exit**: Fade down (stepping away)

---

## Dark Mode

Dark mode is a user preference toggle.

### Dark Mode Colors
| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | #F8FAFC | #0F172A |
| Surface | #FFFFFF | #1E293B |
| Primary text | #1E293B | #F1F5F9 |
| Secondary text | #64748B | #94A3B8 |
| Border | #E2E8F0 | #334155 |
| Primary green | #22C55E | #22C55E (unchanged) |

### Implementation
```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0F172A;
    --color-surface: #1E293B;
    --color-text-primary: #F1F5F9;
    --color-text-secondary: #94A3B8;
    --color-border: #334155;
  }
}

/* Or via class toggle */
.dark {
  --color-background: #0F172A;
  /* ... */
}
```

---

## Accessibility

### Color Contrast
- All text must meet WCAG AA (4.5:1 for normal text, 3:1 for large)
- Primary green (#22C55E) on white passes for large text only — use darker green (#16A34A) for small text if needed
- Never use color alone to convey meaning

### Focus States
- Visible focus ring on all interactive elements
- Use `--color-primary` for focus outlines
- Minimum 2px outline width

### Motion
- Respect `prefers-reduced-motion`
- Provide static alternatives for animations

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Application Examples

### Dashboard Header
- Logo (G mark) left-aligned
- Navigation centered or right
- Notification bell with badge
- User menu with avatar

### Site Card
- Site name (H4, Navy)
- Status badge (colored)
- Last activity (Small, Pavement)
- Quick actions row
- 12px border radius
- Medium shadow

### Modal
- 16px radius top corners
- Squared bottom (grounded)
- Title + description
- Actions right-aligned
- Primary action in green

---

## File Naming

### Assets
- `logo-green.svg` — Primary logo
- `logo-white.svg` — For dark backgrounds
- `favicon.svg` — Browser favicon
- `icon-[name].svg` — UI icons

### Components
Follow the codebase conventions, but include brand tokens:
- `theme.ts` or `tokens.ts` for design tokens
- `colors.ts` for color definitions
- `typography.ts` for font styles

---

## Tagline Options

For marketing or UI headers:
- **Primary**: "One Step At A Time"
- **Alternatives**:
  - "Step Confidently"
  - "Ready for Anything"
  - "Your Next Step"

---

## Quick Reference

```
Primary Green:    #22C55E
Accent Tan:       #D4A574
Navy Text:        #1E293B
Gray Text:        #64748B
Light BG:         #F8FAFC
Dark BG:          #0F172A

Font:             DM Sans / Plus Jakarta Sans
Border Radius:    8-16px
Shadows:          Soft, grounding

Tone:             Confident, warm, calm
Metaphor:         Steps, paths, footprints, journeys
```

---

*These guidelines ensure GreenShoe maintains a consistent, confident, and supportive brand experience across all touchpoints.*
