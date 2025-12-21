# Kipu Brand Guidelines

## The Cosmic Ledger

Kipu's visual identity is inspired by the **Quipu** (also spelled Khipu) — the largest known superstructure of galaxies in the nearby universe. Discovered in early 2025, this colossal cosmic web spans roughly 1.3–1.4 billion light-years and is named after the knotted cords used by Incas for record-keeping due to its filamentary structure.

### Core Concept

Quipu wasn't just decoration — it was **data storage, encoding, relationships, and hierarchy**. We translate that to social systems:

| Quipu Concept | Kipu Translation |
|---------------|------------------|
| Posts | Signals |
| Accounts | Nodes |
| Platforms | Galaxies |
| Virality | Gravitational pull |
| Automation | Unseen force shaping motion |

### Brand Feeling

> "You're not posting content — you're activating a structure."

---

## Visual Language Pillars

### 1. Structure Over Noise
- No messy gradients everywhere
- Everything feels deliberately connected
- Thin lines, subtle nodes, flow diagrams
- Filament-like separators instead of boxes

**Design principle:** *"This UI understands systems."*

---

## Color Palette

### Primary Palette — Deep Cosmic Neutral

These anchor the seriousness and scale.

| Name | Hex | Usage |
|------|-----|-------|
| Void Black | `#05060A` | Main background |
| Deep Space | `#0B1020` | Panels, cards, nav |
| Cold Slate | `#1C2233` | Dividers, secondary surfaces |

### Accent Palette — Quipu Threads

These represent signals flowing through the system. **Use sparingly.**

| Name | Hex | Meaning |
|------|-----|---------|
| Solar Gold | `#E6C27A` | Value / gravity — key CTAs, active states |
| Cosmic Copper | `#C48A5A` | Connection / memory — secondary highlights |
| Ion Teal | `#4FD1C5` | Intelligence / automation — data, AI actions |

**Rule:** Never use all three accent colors at once.

### Text Colors

| Level | Hex |
|-------|-----|
| Primary text | `#E6E8EF` (soft white, not pure) |
| Secondary text | `#9AA3B2` |
| Muted/meta | `#6B7280` |

---

## Typography

### Headings — Architectural

Font: **Space Grotesk**

- Slightly wide tracking (`letter-spacing: 0.01em`)
- Strong vertical rhythm
- No gimmicks

Alternatives: Inter Tight, Satoshi, IBM Plex Sans

### Body Text — Invisible

Font: **Geist** (system default) / **Inter**

- Readable, calm, disappears when read
- Regular weight
- Slightly increased line height
- No thin weights on dark backgrounds

---

## UI Motifs

### 1. Filament Dividers

Instead of hard section breaks:
- Thin glowing lines
- Slight curves
- Small nodes at intersections

**Feels like:** *"This section is connected to the last one."*

```css
.filament-separator {
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(230, 194, 122, 0.15) 20%,
    rgba(230, 194, 122, 0.25) 50%,
    rgba(230, 194, 122, 0.15) 80%,
    transparent 100%
  );
}
```

### 2. Node-Based Highlights

On hover:
- Small dots light up
- Lines subtly animate outward
- Feels like activation, not just hover

### 3. Gravity Animations (Micro-interactions)

Very subtle:
- Buttons slightly "pull in" on hover (scale 0.98)
- Metrics ease into place, not pop
- Charts feel like orbits, not bars

**Principle:** Nothing flashy. Everything inevitable.

---

## Component Styling

### Cards
```css
background: rgba(11, 16, 32, 0.6);  /* Deep Space at 60% */
border: 1px solid rgba(230, 194, 122, 0.1);  /* Subtle gold filament */
backdrop-filter: blur(8px);
```

### Buttons (Primary)
```css
background: #E6C27A;  /* Solar Gold */
color: #05060A;  /* Void Black */
/* Gravity pull on hover */
transform: scale(0.98);
```

### Inputs
```css
background: rgba(28, 34, 51, 0.5);  /* Cold Slate at 50% */
border: 1px solid rgba(230, 194, 122, 0.1);
/* Gold focus ring */
focus: ring-color rgba(230, 194, 122, 0.2);
```

---

## Logo Mark

The Kipu logo represents a cosmic node with radiating filaments:

```
      │
      ▪
   ───◉───
      ▪
      │
```

- Outer ring: `border-[#E6C27A]/30`
- Inner node: `bg-[#E6C27A]/20` with solid core
- Radiating filaments extend from cardinal points

---

## Copy Tone

### Avoid
- "Grow faster 🚀"
- "Crush the algorithm"
- Loud SaaS clichés
- Urgency spam

### Use
- "Signal over noise"
- "Designed for scale"
- "Systems, not shortcuts"
- "Automate the invisible work"

**Style:** Short. Dense. Calm.

---

## Terminology

| Generic Term | Kipu Term |
|-------------|-----------|
| Accounts | Nodes |
| Posts | Signals |
| Workflows | Flows |
| Published | Transmitted |
| Connecting | Initializing |
| Activity | Signal Activity |

---

## File Structure

```
src/
├── app/
│   └── globals.css          # Theme variables & utilities
├── components/
│   └── ui/
│       └── filament-background.tsx  # Cosmic background
```

---

## Quick Reference

### CSS Custom Properties

```css
--color-void: #05060A;
--color-deep-space: #0B1020;
--color-cold-slate: #1C2233;
--color-solar-gold: #E6C27A;
--color-cosmic-copper: #C48A5A;
--color-ion-teal: #4FD1C5;
```

### Utility Classes

```css
.bg-void          /* Main background */
.bg-deep-space    /* Cards, panels */
.bg-cold-slate    /* Secondary surfaces */
.text-solar-gold  /* Gold accent text */
.text-ion-teal    /* Teal accent text */
.border-filament  /* Subtle gold border */
.filament-separator  /* Section divider with nodes */
.gravity-pull     /* Button hover effect */
.metric-ease      /* Fade-in animation */
```
