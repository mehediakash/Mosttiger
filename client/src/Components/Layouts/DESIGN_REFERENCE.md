# Desktop Sidebar - Visual Design Reference

## 🎨 Professional Casino UI Design System

### Color Palette

```
Primary Colors:
├── Sidebar Background:    #1a1a1a (Rich Black)
├── Content Background:    #0f0f0f (Deep Black)
├── Accent/Active:         var(--color-primary) (Golden Yellow)
├── Text Primary:          #d0d0d0 (Light Gray)
└── Text Secondary:        #999    (Medium Gray)

Interactive Colors:
├── Hover Background:      rgba(255, 184, 12, 0.1) (Yellow Tint)
├── Border:                #333    (Dark Border)
├── Shadow:                rgba(0, 0, 0, 0.3) (Dark Shadow)
└── Gradient:              #1a1a1a → #0f0f0f
```

### Layout Dimensions

```
Desktop Sidebar:
├── Expanded Width:        240px
├── Collapsed Width:       70px
├── Logo Height:           40px (expanded) / 32px (collapsed)
├── Menu Item Height:      40px
├── Sidebar Padding:       16px
└── Transition Duration:   0.3s

Content Area:
├── Header Height:         64px
├── Content Padding:       24px
└── Responsive Margin:     240px (expanded) / 70px (collapsed)

Menu Items:
├── Icon Size:             1em (inherited)
├── Text Size:             14px
├── Font Weight:           400 (normal) / 600 (selected)
├── Spacing:               4px margin, 8px padding
└── Rounded:               4px border-radius
```

### Typography

```
Font Family:              System Default (Ant Design)

Sizes:
├── Logo Text:            14px
├── Menu Items:           14px
├── Menu Divider:         12px
├── Header Title:         16px
└── Content:              14px

Weights:
├── Normal:               400
├── Medium:               500
├── Semibold:             600
└── Bold:                 700

Line Heights:
├── Menu Items:           40px (exact)
├── Text:                 1.5em
└── Headings:             1.2em
```

### Visual States

```
Menu Item States:

1. Default
   ├── Background:        #1a1a1a (sidebar background)
   ├── Color:             #d0d0d0 (light gray)
   ├── Icon:              14px, light gray
   └── Transition:        0.3s ease

2. Hover
   ├── Background:        rgba(255, 184, 12, 0.1)
   ├── Color:             var(--color-primary) (yellow)
   ├── Icon:              14px, yellow
   ├── Border Radius:     4px
   └── Box Shadow:        None

3. Active (Selected)
   ├── Background:        var(--color-primary) (yellow)
   ├── Color:             #000 (black text)
   ├── Icon:              14px, black
   ├── Border Radius:     4px
   ├── Font Weight:       600 (semibold)
   └── Box Shadow:        0 2px 8px rgba(255, 184, 12, 0.2)

4. Disabled
   ├── Background:        #1a1a1a
   ├── Color:             #555 (gray)
   ├── Icon:              14px, gray
   ├── Opacity:           0.5
   └── Cursor:            not-allowed

Submenu States:

1. Collapsed
   ├── Icon:              > (chevron right)
   ├── Rotation:          0deg
   └── Children:          Hidden

2. Expanded
   ├── Icon:              ∨ (chevron down)
   ├── Rotation:          180deg
   └── Children:          Visible
```

### Sidebar Collapse Animation

```
Expanded State:
├── Width:                240px
├── Logo:                 Visible (40px)
├── Text:                 Visible (14px)
├── Icons:                Visible
├── Spacing:              Full padding
└── Time:                 0.3s cubic-bezier(0.4, 0, 0.2, 1)

Collapsed State:
├── Width:                70px
├── Logo:                 Visible (32px)
├── Text:                 Hidden (opacity: 0)
├── Icons:                Visible (centered)
├── Spacing:              Minimal padding
└── Time:                 0.3s cubic-bezier(0.4, 0, 0.2, 1)

Animation:
├── Property:             width, all
├── Duration:             0.3s
├── Timing:               cubic-bezier(0.4, 0, 0.2, 1)
├── Direction:            Both
└── Properties:           margin-left (content), width (sidebar)
```

### Sidebar Components

```
┌─────────────────────┐
│    Logo Area        │ ← 56px (16px padding top/bottom)
├─────────────────────┤
│  [←] Collapse Btn   │ ← 48px (40px button + 8px margin)
├─────────────────────┤
│                     │
│    Menu Items       │ ← 40px each (scrollable)
│    - Home           │
│    - Sports         │
│    - Casino         │
│    - Slots          │
│    [+ more]         │
│                     │
│  [────────────]     │ ← Divider
│                     │
│    More Items       │
│    - Promotions     │
│    - Affiliate      │
│    - Contact        │
│                     │
└─────────────────────┘
```

### Header Design

```
Header Layout (64px height):

┌─────────────────────────────────────┐
│ [              ]  [🔔]  [👤]       │ Sticky at top
└─────────────────────────────────────┘
  ↑                    ↑    ↑
  Content Area         |    User Profile
                  Notifications
```

### Main Content Area

```
┌──────────────────────────┐
│  Header (64px)           │
├──────────────────────────┤
│                          │
│  Content Area (24px pad) │
│  ├─ Your Pages Here      │
│  ├─ Responsive Layout    │
│  ├─ Full Width           │
│  └─ Auto Height          │
│                          │
├──────────────────────────┤
│  Footer                  │
└──────────────────────────┘
```

### Responsive Layout (Desktop ≥768px)

```
┌─────────┬──────────────────┐
│ Sidebar │  Header (sticky) │
│ (240px) ├──────────────────┤
│ Fixed   │  Content Area    │
│ Scroll  │  (Responsive)    │
│         ├──────────────────┤
│         │  Footer          │
└─────────┴──────────────────┘
```

### Responsive Layout (Mobile <768px)

```
┌──────────────────────┐
│  Mobile Navbar       │ ← Your existing navbar
├──────────────────────┤
│  Mobile Content      │ ← Full width
│                      │
│  (No sidebar)        │
│                      │
├──────────────────────┤
│  Footer              │
└──────────────────────┘
```

### Icon Usage

```
Icons in Menu Items:

┌─────────────────────────────┐
│ [🏠] Home                  │ Icon 14px + 12px gap + Text
├─────────────────────────────┤
│ [🔥] Hot                    │ Parent icon
│   ├─ [🏟️] Sports           │ Child icon (indented)
│   └─ [💎] Casino           │ Child icon (indented)
├─────────────────────────────┤
│ [👥] Sports                 │
│   ├─ Exchange              │ No icon (child)
│   ├─ SABA                  │ No icon (child)
│   └─ BTI                   │ No icon (child)
└─────────────────────────────┘

Collapsed View:

│ [🏠] │ Only icons, centered
│ [🔥] │
│ [👥] │
```

### Hover & Focus Effects

```
Normal Menu Item:
┌─────────────────┐
│ [🏠] Home       │ Dark background
└─────────────────┘

Hover State:
┌─────────────────┐
│ [🏠] Home       │ Light yellow background
│ ░░░░░░░░░░░░░░░│ Yellow text
└─────────────────┘

Active (Selected):
┌─────────────────┐
│▓[🏠] Home       │ Solid yellow background
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ Black text, bold
└─────────────────┘

Focus (Keyboard):
┌─────────────────┐
│ [🏠] Home       │ Yellow outline
│ ─ ─ ─ ─ ─ ─ ─ │ 2px dashed
└─────────────────┘
```

### Professional Casino Theme

```
Inspired by:
├── Baji        - Dark sidebar with gold accents
├── 1xBet       - Professional dark theme
├── BC.Game     - Modern gaming UI
├── Melbet      - Clean dark interface
└── Stake       - Premium dark design

Key Characteristics:
├── Dark, premium look ✓
├── High contrast (yellow on black) ✓
├── Professional spacing ✓
├── Smooth animations ✓
├── Gaming aesthetic ✓
├── Modern feel ✓
└── Trust & confidence ✓
```

### CSS Transitions

```
Primary Transitions:

1. Sidebar Collapse
   Property:   width
   Duration:   0.3s
   Timing:     cubic-bezier(0.4, 0, 0.2, 1)

2. Menu Items
   Property:   background-color, color
   Duration:   0.2s
   Timing:     ease

3. Content Area
   Property:   margin-left
   Duration:   0.3s
   Timing:     cubic-bezier(0.4, 0, 0.2, 1)

4. Hover Effects
   Property:   all
   Duration:   0.2s
   Timing:     ease

5. Submenu Arrow
   Property:   transform
   Duration:   0.3s
   Timing:     cubic-bezier(0.4, 0, 0.2, 1)
```

### Spacing System

```
Sidebar Internal Spacing:
├── Logo padding:          16px
├── Button margin:         8px
├── Menu item margin:      4px
├── Menu item padding:     8px
├── Divider margin:        8px
└── Content padding:       24px

Menu Item Spacing:
├── Icon width:            1em (14px)
├── Icon-text gap:         12px
├── Item height:           40px
├── Item vertical center:  Yes (line-height: 40px)
└── Horizontal indent:     16px per level
```

### Shadow & Depth

```
Sidebar Shadow:
box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3)

Header Shadow:
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15)

Active Menu Item:
box-shadow: 0 2px 8px rgba(255, 184, 12, 0.2)

Hover Effect:
border-radius: 4px
transition: all 0.3s ease
```

### Accessibility

```
Keyboard Navigation:
├── Tab:           Focus next item
├── Shift+Tab:     Focus previous item
├── Enter/Space:   Activate menu item
├── Arrow Down:    Next item in submenu
├── Arrow Up:      Previous item in submenu
├── Arrow Right:   Expand submenu
├── Arrow Left:    Collapse submenu
└── Escape:        Close submenu

Focus Indicators:
├── Outline:       2px yellow solid
├── Visible:       Yes, always
├── Color:         var(--color-primary)
└── Contrast:      WCAG AAA compliant
```

### Responsive Behavior

```
Desktop (≥768px):           Mobile (<768px):
┌─────────┬────────────┐   ┌──────────────┐
│ Sidebar │  Content   │   │ Mobile Nav   │
│ 240px   │            │   ├──────────────┤
│ Fixed   │            │   │ Content      │
│ Collapse │            │   │ Full Width   │
│ able    │            │   │              │
└─────────┴────────────┘   └──────────────┘

Breakpoint: 768px (md in Ant Design)
Transition: Smooth, no layout shift
Animation: 0.3s cubic-bezier(0.4, 0, 0.2, 1)
```

---

This design system creates a professional casino/betting UI that:

- ✓ Looks premium and trustworthy
- ✓ Is responsive and adaptive
- ✓ Has smooth animations
- ✓ Uses professional colors
- ✓ Maintains excellent accessibility
- ✓ Provides intuitive navigation
- ✓ Matches industry standards

**Perfect for modern gaming and betting platforms! 🎮**
