# DaisyUI removal plan (color parity guaranteed)

Purpose
- Remove DaisyUI permanently while keeping the exact same colors and visual appearance.
- Replace any DaisyUI-only components/utilities with Tailwind + existing shadcn/radix primitives.
- Keep next-themes (attribute="data-theme") so light/dark switching continues to work.

Success criteria
- No DaisyUI dependency or plugin usage.
- Exact color parity (light/dark) vs current UI.
- No usage of DaisyUI-only classes (collapse, table-zebra, badge, tooltip, bg-base-*, text-base-content, etc.).

---

1) Current theming model (what we have today)
- Tailwind v4 is enabled.
- DaisyUI supplies color tokens like --color-primary, --color-base-100, etc., via @plugin blocks in `styles/globals.css`.
- Our semantic tokens (shadcn style) are mapped to DaisyUI’s tokens in `:root` in `styles/globals.css` so components can use:
  - bg-background, text-foreground, bg-primary text-primary-foreground, bg-secondary, text-accent, border-input, ring, etc.
- We also still have many DaisyUI utility usages (bg-base-100/200/300, text-base-content, collapse, table, badge, tooltip...).

Implication: before removing DaisyUI we must a) keep the exact color values by defining them ourselves per theme, and b) replace DaisyUI-only classes/usages.

---

2) Color tokens and exact values to preserve

Light theme (today via DaisyUI):
- --color-primary: #93bbfb
- --color-primary-content: #212638
- --color-secondary: #dae8ff
- --color-secondary-content: #212638
- --color-accent: #93bbfb
- --color-accent-content: #212638
- --color-neutral: #212638
- --color-neutral-content: #ffffff
- --color-base-100: #ffffff
- --color-base-200: #f4f8ff
- --color-base-300: #dae8ff
- --color-base-content: #212638
- --color-info: #93bbfb
- --color-success: #34eeb6
- --color-warning: #ffcf72
- --color-error: #ff8863

Dark theme (today via DaisyUI):
- --color-primary: #212638
- --color-primary-content: #f9fbff
- --color-secondary: #323f61
- --color-secondary-content: #f9fbff
- --color-accent: #4969a6
- --color-accent-content: #f9fbff
- --color-neutral: #f9fbff
- --color-neutral-content: #385183
- --color-base-100: #385183
- --color-base-200: #2a3655
- --color-base-300: #212638
- --color-base-content: #f9fbff
- --color-info: #385183
- --color-success: #34eeb6
- --color-warning: #ffcf72
- --color-error: #ff8863

These are the source of truth for parity.

---

3) Inventory: where DaisyUI is still used (source only)
- Theme plumbing
  - `components/ThemeProvider.tsx` uses next-themes with attribute="data-theme" (keep).
  - `styles/globals.css` uses @plugin "daisyui" and @plugin "daisyui/theme" (to be removed later).

- Color utilities (need replacing or keep via tokens):
  - `components/Header.tsx` → bg-base-100, bg-secondary in active nav pill
  - `app/page.tsx` → bg-base-300, bg-base-100
  - `app/not-found.tsx` → bg-base-200, text-base-content/70
  - `utils/scaffold-eth/notification.tsx` → bg-base-200, shadow-accent, shadow-center
  - `app/blockexplorer/*` → many bg-base-100/300, text-base-content, border-base-300, bg-primary, text-accent
  - `app/debug/*` + `components/scaffold-eth/*` → text-base-content, bg-base-100/200/300, bg-secondary, border-base-300, shadow-secondary, text-accent, etc.

- DaisyUI components/utilities (must be replaced):
  - collapse / collapse-arrow / collapse-title / collapse-content
    - Files: `app/debug/_components/contract/Tuple*.tsx`, `TxReceipt.tsx`
  - table + table-zebra
    - Files: `app/blockexplorer/_components/TransactionsTable.tsx`, `transaction/_components/TransactionComp.tsx`
  - badge / badge-primary
    - Files: `app/blockexplorer/_components/TransactionsTable.tsx`, `transaction/_components/TransactionComp.tsx`, `TupleArray.tsx`
  - tooltip / tooltip-*
    - Files: `app/debug/_components/DebugContracts.tsx`, `InheritanceTooltip.tsx`, `IntegerInput.tsx`, `FaucetButton.tsx`
  - no-animation
    - Files: `app/debug/_components/DebugContracts.tsx`

Note: some shadcn-based components already in use (Button, Switch, Dropdown, Tooltip primitives) help this migration.

---

4) Replacement strategy (incremental, safe)

A. Start using semantic tokens everywhere for colors
- Prefer these first-class tokens (already mapped in `globals.css`):
  - bg-background, text-foreground
  - bg-card, text-card-foreground (for surfaces)
  - bg-primary text-primary-foreground, bg-secondary text-secondary-foreground
  - text-accent, bg-accent, border-input, border-border, ring
- When encountering DaisyUI base tokens, use:
  - bg-base-100 → bg-card (or bg-[var(--color-base-100)] for exactness)
  - bg-base-200 → bg-background (or bg-[var(--color-base-200)])
  - bg-base-300 → bg-[var(--color-base-300)]
  - text-base-content → text-foreground (or text-[var(--color-base-content)])
  - border-base-300 → border-border (or border-[var(--color-base-300)])
  - shadow-accent → shadow-[0_0_12px_-2px_var(--color-accent)]

Why: These map directly to the same underlying --color-* values, preserving exact color.

B. Replace DaisyUI-only components/utilities
- collapse → use Radix Accordion or Collapsible (we already use Radix in the project). Suggested: shadcn/ui Accordion.
  - Replace markup and state with Accordion primitives; style via bg-card/border-border etc.
- table / table-zebra → plain Tailwind table + zebra striping
  - Use table-auto w-full text-left border-collapse
  - Add zebra: odd:bg-[var(--color-base-200)] on <tr> via map, or apply using [&>tbody>tr:nth-child(odd)]:bg-[var(--color-base-200)] on the <table> element.
- badge / badge-primary → create small Badge component
  - Rounded-full px-2 py-0.5 text-xs font-medium
  - Variants: default (bg-accent/10 text-accent border border-[color]) or primary (bg-primary text-primary-foreground)
- tooltip → use existing Radix Tooltip component (we already ship `components/ui/tooltip.tsx`).
  - Replace tooltip classes with <Tooltip><TooltipTrigger/><TooltipContent/></Tooltip>
- no-animation → remove (not needed).

C. Only after A+B are complete: remove DaisyUI
- Remove dependency from `packages/nextjs/package.json`:
  - "daisyui": "5.0.9"
- Update `styles/globals.css`:
  - Remove @plugin "daisyui" and @plugin "daisyui/theme" blocks.
  - Add explicit per-theme variable blocks (copy exact values from section 2):
    - [data-theme="light"] { --color-... }
    - [data-theme="dark"] { --color-... }
  - Keep our existing semantic token mapping in :root that maps `--primary` etc. to `--color-*`.
- Keep next-themes with attribute="data-theme"; switching still flips the same --color-* variables.

Verification
- Build and run the app. Visual compare light/dark before vs after on pages:
  - Home (/)
  - Debug (/debug)
  - Blockexplorer (/blockexplorer and one tx details page)
  - Not Found (/non-existent)
- Colors for surfaces (backgrounds), text, borders, and interactive states should be identical.

---

5) File-by-file TODO checklist (replace DaisyUI usages)
- components/Header.tsx
  - bg-base-100 → bg-background or bg-card (whichever looked identical in your layout). Active pill uses bg-secondary (keep).
- app/page.tsx
  - bg-base-300 → bg-[var(--color-base-300)]
  - bg-base-100 → bg-card
- app/not-found.tsx
  - bg-base-200 → bg-background
  - text-base-content/70 → text-foreground/70
- utils/scaffold-eth/notification.tsx
  - bg-base-200 → bg-background
  - shadow-accent → shadow-[0_0_12px_-2px_var(--color-accent)]
- app/blockexplorer/_components/AddressComponent.tsx
  - bg-base-100 → bg-card
  - border-base-300 → border-border
  - shadow-secondary → shadow-[0_0_12px_-2px_var(--color-secondary)] (or remove if not vital)
- app/blockexplorer/_components/TransactionsTable.tsx
  - table, table-zebra → Tailwind table + zebra striping (see 4B)
  - bg-base-100 → bg-card
  - badge → new Badge component
- app/blockexplorer/transaction/_components/TransactionComp.tsx
  - table (same as above)
  - text-primary-content → text-primary-foreground
  - badge-primary → Badge variant="primary"
- app/debug/* (Tuple.tsx, TupleArray.tsx, TxReceipt.tsx, DebugContracts.tsx, ContractUI.tsx, etc.)
  - collapse → Accordion (shadcn)
  - bg-base-100/200/300 → bg-card/bg-background/bg-[var(--color-base-300)] as appropriate
  - border-base-300 → border-border
  - shadow-secondary/base-300 → shadow-[...] custom or remove
  - tooltip-* → Radix Tooltip
  - no-animation → remove

You can do this in small PRs per area (Header/Home, Blockexplorer, Debug, Notifications).

---

6) Optional migration shim (temporary)
If you need to remove DaisyUI early but cannot update all files at once, you can add a minimal shim to `styles/globals.css` to keep the most common color utilities working without DaisyUI:
- .bg-base-100 { background: var(--color-base-100); }
- .bg-base-200 { background: var(--color-base-200); }
- .bg-base-300 { background: var(--color-base-300); }
- .text-base-content { color: var(--color-base-content); }
- .border-base-300 { border-color: var(--color-base-300); }
- .shadow-accent { box-shadow: 0 0 12px -2px var(--color-accent); }

Prefer finishing the replacements in 5) and then drop this shim.

---

7) Final removal checklist
- [ ] All DaisyUI classes replaced (see section 5).
- [ ] Add explicit [data-theme=light]/[data-theme=dark] variables to `globals.css` (exact values in section 2).
- [ ] Remove @plugin "daisyui" and @plugin "daisyui/theme" in `globals.css`.
- [ ] Remove "daisyui" from package.json.
- [ ] Rerun build, verify parity in both themes on key pages.

---

Notes
- We already use shadcn/radix for Button, Switch, DropdownMenu, Tooltip. Adding Accordion and Badge is straightforward and stays consistent with the existing design system.
- The color tokens will remain exactly the same across the app; only the provider changes from DaisyUI to our own [data-theme] CSS blocks.
