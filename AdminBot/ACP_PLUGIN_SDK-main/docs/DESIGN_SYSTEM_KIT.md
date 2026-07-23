# ADMINCHAT Panel Design System Kit

> For plugin developers building frontend pages that integrate with ADMINCHAT Panel.
> All plugins MUST follow this design system to maintain visual consistency.

---

## Table of Contents

1. [Theme Support](#1-theme-support)
2. [Color Tokens](#2-color-tokens)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Component Patterns](#5-component-patterns)
6. [Do's and Don'ts](#6-dos-and-donts)
7. [Accessibility](#7-accessibility)
8. [Dark Theme Notes](#8-dark-theme-notes)

---

## 1. Theme Support

The ADMINCHAT Panel supports a **dual theme system**: dark mode (default) and light mode. The user can toggle between themes in the Panel settings.

### How It Works

- The host Panel injects CSS custom properties (`--color-*`) into the plugin iframe/container.
- When the user toggles the theme, all `--color-*` variable values update automatically.
- Plugins that use `var(--color-*)` in their styles will adapt to the active theme with zero extra work.

### Rules for Plugin Developers

1. **Always use `var(--color-*)` CSS variables** for colors instead of hardcoded hex values.
2. **Never hardcode hex colors** like `#0C0C0C` or `#FFFFFF` directly in your styles. These will look wrong in the opposite theme.
3. **Do not implement your own theme toggle.** The Panel handles theme switching globally.
4. **Test your plugin in both themes.** Toggle the Panel theme in Settings and verify your plugin renders correctly in both dark and light mode.

### Quick Example

```tsx
{/* WRONG: hardcoded colors break in light mode */}
<div className="bg-[#0A0A0A] text-[#FFFFFF] border-[#2f2f2f]">

{/* CORRECT: CSS variables adapt to both themes */}
<div className="bg-[var(--color-bg-card)] text-[var(--color-text-primary)] border-[var(--color-border)]">
```

---

## 2. Color Tokens

The Panel uses a dark-first design system with light mode support. All colors are available as CSS custom properties injected by the host application.

### Backgrounds

| Token | Hex (dark default) | CSS Variable | Usage |
|-------|-----|--------------|-------|
| Page Background | `#0C0C0C` | `var(--color-bg-page)` | Main page background |
| Sidebar Background | `#080808` | `var(--color-bg-sidebar)` | Sidebar and navigation |
| Card Background | `#0A0A0A` | `var(--color-bg-card)` | Cards, panels, sections |
| Elevated Background | `#141414` | `var(--color-bg-elevated)` | Inputs, dropdowns, modals, hover states |

> **Note:** Hex values shown are the dark theme defaults. In light mode these resolve to different values automatically.

### Accent & Status

| Token | Hex (dark default) | CSS Variable | Usage |
|-------|-----|--------------|-------|
| Primary Accent | `#00D9FF` | `var(--color-accent)` | Primary buttons, links, active states, focus rings |
| Accent Hover | `#00C4E8` | `var(--color-accent-hover)` | Hover state for accent-colored elements |
| Success / Green | `#059669` | `var(--color-green)` | Active, approved, online, running |
| Warning / Orange | `#FF8800` | `var(--color-orange)` | Pending, warning, queued |
| Error / Red | `#FF4444` | `var(--color-red)` | Error, rejected, failed, danger |
| Purple | `#8B5CF6` | `var(--color-purple)` | Roles, premium, special status |
| Blue | `#3B82F6` | `var(--color-blue)` | Info, links, secondary accent |
| Gold | `#F59E0B` | `var(--color-gold)` | Featured, starred, premium highlights |

> **Tip:** For muted status backgrounds, use the CSS variable with Tailwind opacity: `bg-[var(--color-green)]/10`.

### Text

| Token | Hex (dark default) | CSS Variable | Usage |
|-------|-----|--------------|-------|
| Text Primary | `#FFFFFF` | `var(--color-text-primary)` | Headings, important values, active text |
| Text Secondary | `#8a8a8a` | `var(--color-text-secondary)` | Body text, descriptions, labels |
| Text Muted | `#6a6a6a` | `var(--color-text-muted)` | Timestamps, helper text, disabled labels |
| Text Placeholder | `#4a4a4a` | `var(--color-text-placeholder)` | Input placeholders, empty state icons |

### Borders

| Token | Hex (dark default) | CSS Variable | Usage |
|-------|-----|--------------|-------|
| Border Default | `#2f2f2f` | `var(--color-border)` | Card borders, input borders, dividers |
| Border Subtle | `#1A1A1A` | `var(--color-border-subtle)` | Table row separators, subtle dividers |

### Usage in Tailwind

```html
<!-- PREFERRED: Using CSS variables (theme-aware, works in both dark and light mode) -->
<div class="bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)]">

<!-- AVOID: Hardcoded hex values break in light mode -->
<div class="bg-[#0A0A0A] border border-[#2f2f2f] text-white">
```

### Complete Variable Reference

```css
/* Backgrounds */
--color-bg-page          /* Main page background */
--color-bg-sidebar       /* Sidebar and navigation */
--color-bg-card          /* Cards, panels, sections */
--color-bg-elevated      /* Inputs, dropdowns, modals, hover states */

/* Accent */
--color-accent           /* Primary accent (cyan) */
--color-accent-hover     /* Accent hover state */

/* Status colors */
--color-green            /* Success, approved, online */
--color-orange           /* Warning, pending */
--color-red              /* Error, rejected, danger */
--color-purple           /* Roles, premium, special */
--color-blue             /* Info, links */
--color-gold             /* Featured, starred */

/* Text */
--color-text-primary     /* Headings, important values */
--color-text-secondary   /* Body text, descriptions */
--color-text-muted       /* Timestamps, helper text */
--color-text-placeholder /* Placeholders, empty states */

/* Borders */
--color-border           /* Default borders, dividers */
--color-border-subtle    /* Subtle separators */
```

---

## 3. Typography

### Font Families

| Context | Font | Tailwind Class | CSS Variable |
|---------|------|----------------|--------------|
| Headings | Space Grotesk | `font-['Space_Grotesk']` | `var(--font-heading)` |
| Body / UI | Inter | `font-['Inter']` | `var(--font-body)` |
| Data / Code / Mono | JetBrains Mono | `font-mono` | `var(--font-mono)` |

### Font Sizes

| Element | Size | Weight | Line Height | Tailwind Classes |
|---------|------|--------|-------------|------------------|
| Page Title | 20px | 600 (semibold) | 28px | `text-xl font-semibold leading-7` |
| Section Heading | 16px | 600 (semibold) | 24px | `text-base font-semibold leading-6` |
| Card Title | 14px | 500 (medium) | 20px | `text-sm font-medium leading-5` |
| Body Text | 14px | 400 (normal) | 20px | `text-sm leading-5` |
| Small Text | 13px | 400 (normal) | 18px | `text-[13px] leading-[18px]` |
| Caption / Label | 12px | 500 (medium) | 16px | `text-xs font-medium leading-4` |
| Tiny / Badge | 11px | 500 (medium) | 14px | `text-[11px] font-medium leading-[14px]` |
| Stat Value | 24px | 700 (bold) | 32px | `text-2xl font-bold leading-8` |

### Monospace Usage

Use `font-mono` (JetBrains Mono) for:
- IDs and counts: `#42`, `142`
- Timestamps: `2026-03-24`
- Code snippets
- Data values in stats cards
- Table cell data that is numeric or identifier-like

```html
<span class="font-mono text-xs text-[#8a8a8a]">#42</span>
<span class="font-mono text-2xl font-bold text-white">142</span>
```

---

## 4. Spacing & Layout

### Page Layout

```html
<!-- Standard plugin page layout -->
<div class="px-8 py-6 space-y-6">
  <!-- Page header -->
  <!-- Content sections -->
</div>
```

| Element | Spacing | Tailwind |
|---------|---------|----------|
| Page horizontal padding | 32px | `px-8` |
| Page vertical padding | 24px | `py-6` |
| Gap between page sections | 24px | `space-y-6` or `gap-6` |
| Gap between cards in a row | 16px | `gap-4` |
| Card internal padding | 20px | `p-5` |
| Form field spacing | 16px | `space-y-4` |
| Button internal padding | 8px 16px | `px-4 py-2` |
| Input internal padding | 8px 12px | `px-3 py-2` |
| Badge internal padding | 2px 8px | `px-2 py-0.5` |
| Icon-to-text gap | 8px | `gap-2` |
| Table cell padding | 12px 16px | `px-4 py-3` |

### Border Radius

| Element | Radius | Tailwind |
|---------|--------|----------|
| Cards / Containers | 10px | `rounded-[10px]` |
| Buttons | 8px | `rounded-lg` |
| Inputs / Selects | 8px | `rounded-lg` |
| Badges / Tags | 4px | `rounded` |
| Avatars / Icons | Full circle | `rounded-full` |
| Modals / Dialogs | 12px | `rounded-xl` |
| Tooltips | 6px | `rounded-md` |

---

## 5. Component Patterns

Copy-paste ready Tailwind patterns for common UI elements.

### 5.1 Page Header

```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
    {/* Icon container */}
    <div className="w-10 h-10 rounded-lg bg-[#00D9FF]/10 flex items-center justify-center">
      <Film size={20} className="text-[#00D9FF]" />
    </div>
    <div>
      <h1 className="text-xl font-semibold text-white font-['Space_Grotesk']">
        Movie Requests
      </h1>
      <p className="text-sm text-[#8a8a8a]">
        Manage user movie requests
      </p>
    </div>
  </div>
  {/* Action buttons */}
  <div className="flex items-center gap-3">
    <button className="bg-[#00D9FF] hover:bg-[#00C4E8] text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors">
      New Request
    </button>
  </div>
</div>
```

### 5.2 Stats Card Row

```tsx
<div className="grid grid-cols-4 gap-4">
  {/* Single stat card */}
  <div className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-[10px] p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-[#8a8a8a] uppercase tracking-wider">
        Total Requests
      </span>
      <div className="w-8 h-8 rounded-lg bg-[#00D9FF]/10 flex items-center justify-center">
        <Film size={16} className="text-[#00D9FF]" />
      </div>
    </div>
    <div className="font-mono text-2xl font-bold text-white">142</div>
  </div>

  {/* Pending stat */}
  <div className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-[10px] p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-[#8a8a8a] uppercase tracking-wider">
        Pending
      </span>
      <div className="w-8 h-8 rounded-lg bg-[#FF8800]/10 flex items-center justify-center">
        <Clock size={16} className="text-[#FF8800]" />
      </div>
    </div>
    <div className="font-mono text-2xl font-bold text-white">23</div>
  </div>

  {/* Approved stat */}
  <div className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-[10px] p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-[#8a8a8a] uppercase tracking-wider">
        Approved
      </span>
      <div className="w-8 h-8 rounded-lg bg-[#059669]/10 flex items-center justify-center">
        <CheckCircle size={16} className="text-[#059669]" />
      </div>
    </div>
    <div className="font-mono text-2xl font-bold text-white">98</div>
  </div>

  {/* Rejected stat */}
  <div className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-[10px] p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-medium text-[#8a8a8a] uppercase tracking-wider">
        Rejected
      </span>
      <div className="w-8 h-8 rounded-lg bg-[#FF4444]/10 flex items-center justify-center">
        <XCircle size={16} className="text-[#FF4444]" />
      </div>
    </div>
    <div className="font-mono text-2xl font-bold text-white">21</div>
  </div>
</div>
```

### 5.3 Tab Navigation

```tsx
<div className="flex items-center gap-1 border-b border-[#2f2f2f] mb-6">
  {/* Active tab */}
  <button className="px-4 py-2.5 text-sm font-medium text-[#00D9FF] border-b-2 border-[#00D9FF] -mb-px transition-colors">
    All Requests
  </button>
  {/* Inactive tab */}
  <button className="px-4 py-2.5 text-sm font-medium text-[#6a6a6a] border-b-2 border-transparent hover:text-[#8a8a8a] -mb-px transition-colors">
    Pending
  </button>
  {/* Inactive tab with badge */}
  <button className="px-4 py-2.5 text-sm font-medium text-[#6a6a6a] border-b-2 border-transparent hover:text-[#8a8a8a] -mb-px transition-colors flex items-center gap-2">
    Rejected
    <span className="bg-[#FF4444]/10 text-[#FF4444] text-[11px] font-medium px-1.5 py-0.5 rounded">
      3
    </span>
  </button>
</div>
```

### 5.4 Data Table

```tsx
{/* Table container */}
<div className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-[10px] overflow-hidden">
  <table className="w-full">
    {/* Table header */}
    <thead>
      <tr className="border-b border-[#1A1A1A]">
        <th className="text-left px-4 py-3 text-xs font-medium text-[#6a6a6a] uppercase tracking-wider">
          ID
        </th>
        <th className="text-left px-4 py-3 text-xs font-medium text-[#6a6a6a] uppercase tracking-wider">
          Title
        </th>
        <th className="text-left px-4 py-3 text-xs font-medium text-[#6a6a6a] uppercase tracking-wider">
          User
        </th>
        <th className="text-left px-4 py-3 text-xs font-medium text-[#6a6a6a] uppercase tracking-wider">
          Status
        </th>
        <th className="text-left px-4 py-3 text-xs font-medium text-[#6a6a6a] uppercase tracking-wider">
          Date
        </th>
      </tr>
    </thead>
    {/* Table body */}
    <tbody className="divide-y divide-[#1A1A1A]">
      <tr className="hover:bg-[#1A1A1A] transition-colors cursor-pointer">
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-[#8a8a8a]">#42</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-white">Fight Club</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-[#8a8a8a]">@john_doe</span>
        </td>
        <td className="px-4 py-3">
          {/* Status badge (see 5.5) */}
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FF8800]/10 text-[#FF8800]">
            Pending
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-[#6a6a6a]">Mar 24, 2026</span>
        </td>
      </tr>
    </tbody>
  </table>

  {/* Pagination */}
  <div className="flex items-center justify-between px-4 py-3 border-t border-[#1A1A1A]">
    <span className="text-xs text-[#6a6a6a]">Showing 1-10 of 142</span>
    <div className="flex items-center gap-1">
      <button className="px-3 py-1.5 text-xs text-[#6a6a6a] hover:text-white bg-transparent hover:bg-[#141414] rounded-md transition-colors disabled:opacity-40"
        disabled>
        Previous
      </button>
      <button className="px-3 py-1.5 text-xs text-black bg-[#00D9FF] rounded-md font-medium">
        1
      </button>
      <button className="px-3 py-1.5 text-xs text-[#8a8a8a] hover:text-white hover:bg-[#141414] rounded-md transition-colors">
        2
      </button>
      <button className="px-3 py-1.5 text-xs text-[#8a8a8a] hover:text-white hover:bg-[#141414] rounded-md transition-colors">
        3
      </button>
      <button className="px-3 py-1.5 text-xs text-[#8a8a8a] hover:text-white hover:bg-[#141414] rounded-md transition-colors">
        Next
      </button>
    </div>
  </div>
</div>
```

### 5.5 Status Badges

```tsx
{/* Pending / Warning — orange */}
<span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FF8800]/10 text-[#FF8800]">
  Pending
</span>

{/* Active / Approved / Success — green */}
<span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#059669]/10 text-[#059669]">
  Approved
</span>

{/* Error / Rejected / Failed — red */}
<span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#FF4444]/10 text-[#FF4444]">
  Rejected
</span>

{/* Info / New — cyan */}
<span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#00D9FF]/10 text-[#00D9FF]">
  New
</span>

{/* Disabled / Inactive — gray */}
<span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#6a6a6a]/10 text-[#6a6a6a]">
  Inactive
</span>

{/* Role / Premium — purple */}
<span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#8B5CF6]/10 text-[#8B5CF6]">
  Premium
</span>

{/* With dot indicator */}
<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#059669]/10 text-[#059669]">
  <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
  Online
</span>
```

### 5.6 Form Inputs

```tsx
{/* Text input */}
<div className="space-y-1.5">
  <label className="text-xs font-medium text-[#8a8a8a]">API Key</label>
  <input
    type="text"
    placeholder="Enter your API key"
    className="w-full bg-[#141414] border border-[#2f2f2f] rounded-lg px-3 py-2 text-sm text-white
               placeholder-[#4a4a4a] focus:border-[#00D9FF] focus:outline-none focus:ring-1 focus:ring-[#00D9FF]/30
               transition-colors"
  />
</div>

{/* Text input with error */}
<div className="space-y-1.5">
  <label className="text-xs font-medium text-[#8a8a8a]">API Key</label>
  <input
    type="text"
    className="w-full bg-[#141414] border border-[#FF4444] rounded-lg px-3 py-2 text-sm text-white
               placeholder-[#4a4a4a] focus:border-[#FF4444] focus:outline-none focus:ring-1 focus:ring-[#FF4444]/30
               transition-colors"
  />
  <p className="text-xs text-[#FF4444]">API key is required</p>
</div>

{/* Select dropdown */}
<div className="space-y-1.5">
  <label className="text-xs font-medium text-[#8a8a8a]">Language</label>
  <select className="w-full bg-[#141414] border border-[#2f2f2f] rounded-lg px-3 py-2 text-sm text-white
                     focus:border-[#00D9FF] focus:outline-none focus:ring-1 focus:ring-[#00D9FF]/30
                     transition-colors appearance-none">
    <option value="en">English</option>
    <option value="ja">Japanese</option>
  </select>
</div>

{/* Textarea */}
<div className="space-y-1.5">
  <label className="text-xs font-medium text-[#8a8a8a]">Notes</label>
  <textarea
    rows={4}
    placeholder="Enter notes..."
    className="w-full bg-[#141414] border border-[#2f2f2f] rounded-lg px-3 py-2 text-sm text-white
               placeholder-[#4a4a4a] focus:border-[#00D9FF] focus:outline-none focus:ring-1 focus:ring-[#00D9FF]/30
               transition-colors resize-none"
  />
</div>

{/* Toggle / Switch */}
<label className="flex items-center gap-3 cursor-pointer">
  <div className="relative">
    <input type="checkbox" className="sr-only peer" />
    <div className="w-9 h-5 bg-[#2f2f2f] rounded-full peer-checked:bg-[#00D9FF] transition-colors"></div>
    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
  </div>
  <span className="text-sm text-[#8a8a8a]">Auto-approve requests</span>
</label>
```

### 5.7 Buttons

```tsx
{/* Primary button (cyan) */}
<button className="bg-[#00D9FF] hover:bg-[#00C4E8] text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors">
  Create Request
</button>

{/* Primary button with icon */}
<button className="bg-[#00D9FF] hover:bg-[#00C4E8] text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
  <Plus size={16} />
  Add New
</button>

{/* Secondary / Ghost button */}
<button className="bg-transparent hover:bg-[#141414] text-[#8a8a8a] hover:text-white border border-[#2f2f2f] px-4 py-2 rounded-lg text-sm font-medium transition-colors">
  Cancel
</button>

{/* Danger button (red) */}
<button className="bg-[#FF4444] hover:bg-[#E03E3E] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
  Delete
</button>

{/* Subtle / Text button */}
<button className="text-[#8a8a8a] hover:text-white text-sm transition-colors">
  View all
</button>

{/* Icon-only button */}
<button className="p-2 rounded-lg hover:bg-[#141414] text-[#6a6a6a] hover:text-white transition-colors">
  <MoreVertical size={16} />
</button>

{/* Disabled state (applies to any variant) */}
<button className="bg-[#00D9FF] text-black px-4 py-2 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed" disabled>
  Processing...
</button>

{/* Small button variant */}
<button className="bg-[#00D9FF] hover:bg-[#00C4E8] text-black px-3 py-1.5 rounded-md text-xs font-medium transition-colors">
  Approve
</button>
```

### 5.8 Empty States

```tsx
<div className="flex flex-col items-center justify-center py-20">
  <div className="w-16 h-16 rounded-full bg-[#141414] flex items-center justify-center mb-4">
    <Film size={28} className="text-[#4a4a4a]" />
  </div>
  <h3 className="text-base font-medium text-white mb-1">No movie requests yet</h3>
  <p className="text-sm text-[#6a6a6a] mb-6 text-center max-w-sm">
    Requests will appear here when users submit them via the bot.
  </p>
  <button className="bg-[#00D9FF] hover:bg-[#00C4E8] text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors">
    Import Requests
  </button>
</div>
```

### 5.9 Loading States

```tsx
{/* Spinner (inline) */}
<div className="flex items-center gap-2">
  <Loader2 size={16} className="animate-spin text-[#00D9FF]" />
  <span className="text-sm text-[#8a8a8a]">Loading...</span>
</div>

{/* Full page loading */}
<div className="flex items-center justify-center py-20">
  <Loader2 size={24} className="animate-spin text-[#00D9FF]" />
</div>

{/* Skeleton loading for table rows */}
<tr className="animate-pulse">
  <td className="px-4 py-3">
    <div className="h-4 w-12 bg-[#141414] rounded"></div>
  </td>
  <td className="px-4 py-3">
    <div className="h-4 w-40 bg-[#141414] rounded"></div>
  </td>
  <td className="px-4 py-3">
    <div className="h-4 w-24 bg-[#141414] rounded"></div>
  </td>
  <td className="px-4 py-3">
    <div className="h-5 w-16 bg-[#141414] rounded"></div>
  </td>
</tr>

{/* Skeleton loading for stats cards */}
<div className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-[10px] p-5 animate-pulse">
  <div className="flex items-center justify-between mb-3">
    <div className="h-3 w-24 bg-[#141414] rounded"></div>
    <div className="w-8 h-8 bg-[#141414] rounded-lg"></div>
  </div>
  <div className="h-8 w-16 bg-[#141414] rounded"></div>
</div>
```

### 5.10 Card Containers

```tsx
{/* Standard card */}
<div className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-[10px] p-5">
  <h3 className="text-sm font-medium text-white mb-4">Section Title</h3>
  <p className="text-sm text-[#8a8a8a]">Card content goes here.</p>
</div>

{/* Card with header and divider */}
<div className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-[10px]">
  <div className="px-5 py-4 border-b border-[#1A1A1A] flex items-center justify-between">
    <h3 className="text-sm font-medium text-white">Recent Activity</h3>
    <button className="text-xs text-[#00D9FF] hover:underline">View all</button>
  </div>
  <div className="p-5">
    {/* Card body content */}
  </div>
</div>

{/* Card group (stacked) */}
<div className="space-y-4">
  <div className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-[10px] p-5">
    {/* Card 1 */}
  </div>
  <div className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-[10px] p-5">
    {/* Card 2 */}
  </div>
</div>

{/* Card grid (side by side) */}
<div className="grid grid-cols-2 gap-4">
  <div className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-[10px] p-5">
    {/* Left card */}
  </div>
  <div className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-[10px] p-5">
    {/* Right card */}
  </div>
</div>
```

### 5.11 Modal / Dialog

```tsx
{/* Modal overlay */}
<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
  <div className="bg-[#0A0A0A] border border-[#2f2f2f] rounded-xl w-full max-w-md mx-4">
    {/* Header */}
    <div className="px-6 py-4 border-b border-[#1A1A1A] flex items-center justify-between">
      <h2 className="text-base font-semibold text-white">Confirm Action</h2>
      <button className="p-1 rounded hover:bg-[#141414] text-[#6a6a6a] hover:text-white transition-colors">
        <X size={16} />
      </button>
    </div>
    {/* Body */}
    <div className="px-6 py-5">
      <p className="text-sm text-[#8a8a8a]">
        Are you sure you want to delete this request? This action cannot be undone.
      </p>
    </div>
    {/* Footer */}
    <div className="px-6 py-4 border-t border-[#1A1A1A] flex items-center justify-end gap-3">
      <button className="bg-transparent hover:bg-[#141414] text-[#8a8a8a] hover:text-white border border-[#2f2f2f] px-4 py-2 rounded-lg text-sm font-medium transition-colors">
        Cancel
      </button>
      <button className="bg-[#FF4444] hover:bg-[#E03E3E] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
        Delete
      </button>
    </div>
  </div>
</div>
```

### 5.12 Toast / Notification

```tsx
{/* Success toast */}
<div className="fixed bottom-6 right-6 bg-[#141414] border border-[#059669]/30 rounded-lg p-4 flex items-start gap-3 shadow-lg max-w-sm">
  <div className="w-5 h-5 rounded-full bg-[#059669]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
    <CheckCircle size={12} className="text-[#059669]" />
  </div>
  <div>
    <p className="text-sm font-medium text-white">Request approved</p>
    <p className="text-xs text-[#6a6a6a] mt-0.5">Fight Club has been added to the queue.</p>
  </div>
  <button className="p-1 text-[#6a6a6a] hover:text-white flex-shrink-0">
    <X size={14} />
  </button>
</div>

{/* Error toast */}
<div className="fixed bottom-6 right-6 bg-[#141414] border border-[#FF4444]/30 rounded-lg p-4 flex items-start gap-3 shadow-lg max-w-sm">
  <div className="w-5 h-5 rounded-full bg-[#FF4444]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
    <XCircle size={12} className="text-[#FF4444]" />
  </div>
  <div>
    <p className="text-sm font-medium text-white">Failed to approve</p>
    <p className="text-xs text-[#6a6a6a] mt-0.5">TMDB API returned an error. Please try again.</p>
  </div>
</div>
```

---

## 6. Do's and Don'ts

### DO

- **DO** use the CSS custom properties (`var(--color-*)`) for all colors. This ensures your plugin works in both dark and light themes.
- **DO** use `lucide-react` for all icons. Use size 16 for inline/table contexts and size 20 for navigation/headers.
- **DO** use `font-mono` (JetBrains Mono) for data values, IDs, counts, and timestamps.
- **DO** use `font-['Space_Grotesk']` for page-level headings.
- **DO** use the exact border radius values: `rounded-[10px]` for cards, `rounded-lg` for buttons/inputs, `rounded` for badges.
- **DO** use the muted-background + colored-text pattern for status badges (e.g., `bg-[#059669]/10 text-[#059669]`).
- **DO** keep the page structure consistent: page padding `px-8 py-6`, sections separated by `gap-6`.
- **DO** use `transition-colors` on all interactive elements for smooth hover effects.
- **DO** use the `@acp/plugin-sdk` pre-built components when they fit your needs.
- **DO** test your plugin at different viewport widths (the Panel supports 1280px minimum).

### DON'T

- **DON'T** use custom colors outside the defined palette. If you need a color not in the system, request it through the SDK issue tracker.
- **DON'T** use fonts other than Space Grotesk, Inter, and JetBrains Mono.
- **DON'T** hardcode pixel values for common spacing. Use Tailwind's spacing scale (`gap-4`, `p-5`, `px-8`, etc.).
- **DON'T** hardcode hex color values. Always use `var(--color-*)` CSS variables so your plugin adapts to both dark and light themes.
- **DON'T** use bright/saturated backgrounds. The Panel is dark-first; all backgrounds should use the `--color-bg-*` variables.
- **DON'T** use `box-shadow` for elevation. Use subtle borders (`border-[#2f2f2f]`) instead.
- **DON'T** override the host application's global styles. Your plugin runs inside the Panel's layout.
- **DON'T** use inline styles when Tailwind classes are available.
- **DON'T** use color opacity less than `/10` for muted backgrounds — they become invisible on dark backgrounds.
- **DON'T** use white (`#FFFFFF`) for large body text blocks. Use `#8a8a8a` (secondary) for body text and reserve white for headings and important values.
- **DON'T** create custom scrollbar styles. The Panel's global scrollbar styles apply everywhere.

---

## 7. Accessibility

### Contrast Ratios

All text colors meet WCAG AA contrast requirements against their intended backgrounds:

| Text Color | On Background | Contrast Ratio | WCAG Level |
|------------|---------------|----------------|------------|
| `#FFFFFF` (primary) | `#0C0C0C` (page) | 19.4:1 | AAA |
| `#FFFFFF` (primary) | `#0A0A0A` (card) | 19.0:1 | AAA |
| `#8a8a8a` (secondary) | `#0C0C0C` (page) | 6.1:1 | AA |
| `#8a8a8a` (secondary) | `#0A0A0A` (card) | 5.9:1 | AA |
| `#6a6a6a` (muted) | `#0C0C0C` (page) | 4.0:1 | AA (large) |
| `#00D9FF` (accent) | `#0C0C0C` (page) | 10.8:1 | AAA |
| `#000000` (on accent) | `#00D9FF` (accent bg) | 10.8:1 | AAA |

### Focus Indicators

All interactive elements must show visible focus indicators:

```css
/* Standard focus ring (applied via Tailwind) */
focus:border-[#00D9FF] focus:outline-none focus:ring-1 focus:ring-[#00D9FF]/30

/* Button focus */
focus-visible:outline-2 focus-visible:outline-[#00D9FF] focus-visible:outline-offset-2
```

- Use `focus-visible` instead of `focus` for button elements to avoid showing focus rings on mouse clicks.
- All focus rings use the accent color (`#00D9FF`).

### Keyboard Navigation

- All interactive elements must be reachable via Tab key.
- Modal dialogs must trap focus within the dialog.
- Pressing Escape should close modals and dropdowns.
- Tables should support keyboard row navigation when `onRowClick` is provided.

### Screen Readers

- Use semantic HTML elements: `<button>`, `<table>`, `<nav>`, `<main>`, `<header>`.
- Add `aria-label` to icon-only buttons.
- Status badges should include `role="status"` when they represent live state.
- Loading spinners should include `aria-label="Loading"`.

```tsx
{/* Icon-only button with aria-label */}
<button
  aria-label="More options"
  className="p-2 rounded-lg hover:bg-[#141414] text-[#6a6a6a] hover:text-white transition-colors"
>
  <MoreVertical size={16} />
</button>

{/* Loading spinner */}
<Loader2 size={24} className="animate-spin text-[#00D9FF]" aria-label="Loading" role="status" />
```

---

## 8. Dark Theme Notes

The ADMINCHAT Panel defaults to a dark theme but also supports light mode. Plugin designs should use `var(--color-*)` CSS variables to work correctly in both themes.

### Background Hierarchy (darkest to lightest)

```
#080808  — Sidebar (deepest layer)
#0A0A0A  — Cards and content areas
#0C0C0C  — Page background (canvas)
#141414  — Elevated elements (inputs, dropdowns, hover states)
#1A1A1A  — Hover state overlays, subtle borders
#2f2f2f  — Visible borders and dividers
```

### Image & Media Considerations

- Avoid images with pure white backgrounds — they create harsh contrast. Use images with neutral or dark backgrounds.
- For user-uploaded content (avatars, media), wrap in a container with `rounded-lg overflow-hidden` to maintain the design language.
- SVG icons should use `currentColor` to inherit the text color.

### Scrollbar Styling

The Panel applies custom scrollbar styles globally. Plugin content inside scrollable containers will automatically inherit these styles. Do not override them.
