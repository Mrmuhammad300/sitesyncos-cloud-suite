---
name: SiteSync Design System
description: Full color palette, card system, glassmorphism, glow effects, status badges, spacing
type: design
---

## Color Palette
- Navy Deep: hsl(222 47% 6%) — dark mode background
- Card Surface: hsl(222 41% 10%) — card backgrounds with gradient
- Blue Primary: hsl(217 91% 60%) — CTAs, links, accent, glows
- Accent Purple: hsl(262 83% 58%) — secondary accent
- Blue Light: hsl(217 91% 70%) — hovers
- Success: hsl(160 84% 39%)
- Warning: hsl(38 92% 50%)
- Destructive: hsl(0 84% 60%)
- Muted FG: hsl(215 20% 65%)
- Border dark: hsl(217 33% 17%)

## Card System (CSS classes)
- `.ss-card` — base card with subtle blue border
- `.ss-card-glow` — card with blue glow shadow
- `.ss-module-card` — clickable module card (BUILD/OPS/VAULT) with hover scale
- `.ss-module-icon` — circular icon container with blue ring
- `.ss-stat-card` — KPI stat card
- `.ss-stat-value` / `.ss-stat-label` — stat typography

## Status Badges
- `.badge-active` — blue primary
- `.badge-progress` — warning yellow
- `.badge-complete` — success green
- `.badge-closed` — muted gray
- `.badge-overdue` — destructive red
- `.badge-urgent` — solid red

## Search
- `.ss-search` — rounded search bar with focus glow

## Typography
- Font: Inter (sans), JetBrains Mono (mono)
- Section headers: `text-xs font-bold uppercase tracking-widest text-muted-foreground`

## Default Theme
- App defaults to dark mode (`<html class="dark">`)
- Dark-first design matching SiteSync video aesthetic
