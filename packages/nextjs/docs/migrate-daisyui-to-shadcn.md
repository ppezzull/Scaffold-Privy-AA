# Migration plan: DaisyUI -> shadcn/ui

This document inventories DaisyUI usage in the Next.js app and maps each piece to shadcn/ui counterparts. It also defines an incremental plan to migrate safely without breaking UX. shadcn/ui has already been initialized in this repo.

## Scope and goals
- Replace DaisyUI classes/components with shadcn/ui primitives and utilities.
- Keep Tailwind v4 setup and colors; move away from DaisyUI theming/plugins.
- Preserve existing UX and accessibility; reduce custom CSS where possible.

## Global styling and theming
Files:
- `styles/globals.css` uses DaisyUI plugins and theme variables:
  - `@plugin "daisyui"` and `@plugin "daisyui/theme"` (light/dark tokens)
  - Global utility styles for `.btn`, `.btn-ghost`, `.link`, etc.
- Theme switching: `components/ThemeProvider.tsx` (next-themes) and `components/SwitchTheme.tsx` uses DaisyUI classes (`toggle`, `swap`).

Actions:
1) Remove DaisyUI plugins from `globals.css` after components are migrated. Replace with CSS variables under `:root` and `.dark` already present in file (these are compatible with shadcn/ui tokens). Keep Tailwind v4 `@theme` blocks.
2) Replace `.btn`, `.link`, `.toggle`, `.swap`, `.menu`, `.dropdown`, `.modal`, `.skeleton`, etc., with shadcn/ui components and/or Tailwind utilities.
3) Ensure `<html className="dark">` toggling via `next-themes` works (shadcn/ui expects `class` strategy). Configure in `app/layout.tsx`:
  - `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`
4) Remove DaisyUI dependency from `package.json` after migration; keep `@tailwindcss/postcss` and Tailwind config stable.

### Finalize globals: shadcn-only (important)
Once all components are migrated off DaisyUI classes, convert `globals.css` to only use shadcn-compatible globals. The repo currently has the shadcn sections commented out—uncomment them and remove DaisyUI.

- File: `packages/nextjs/styles/globals.css`
  1. Remove DaisyUI plugin blocks completely:
    - Remove the whole `@plugin "daisyui" { ... }` block.
    - Remove the two `@plugin "daisyui/theme" { name: "light" ... }` and `{ name: "dark" ... }` blocks.
  2. Remove DaisyUI-only helpers:
    - Delete the `.btn { ... }`, `.btn.btn-ghost { ... }`, and `.link{ ... }` overrides.
    - Delete `:root, [data-theme] { background: var(--color-base-200); }` and any remaining `bg-base-*` usages.
    - You can keep one `@custom-variant dark ...` line or rely purely on the `.dark` class; shadcn/ui typically uses the `.dark` class strategy.
  3. Enable shadcn token mappings by UN-COMMENTING these blocks (they are currently commented out in your file):
    - `@theme inline { ... }` block mapping CSS vars to Tailwind tokens (background, foreground, border, input, ring, etc.).
    - `:root { ... }` CSS variables for the light theme.
    - `.dark { ... }` CSS variables for the dark theme.
    - `@layer base { * { @apply border-border outline-ring/50 } body { @apply bg-background text-foreground } }` base layer.
  4. Keep the Tailwind v4 pieces at the top:
    - `@import "tailwindcss";`
    - `@import "tw-animate-css";` (if you still want animations)
    - Your `@theme { --shadow-center ... }` utilities can remain if used.

- File: `packages/nextjs/app/layout.tsx`
  - Update ThemeProvider to use class strategy for shadcn:
   - `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`
  - Ensure `<html>` does not depend on `data-theme`; using the class strategy, toggling will apply `.dark` to `<html>`.

After these changes, the only theme tokens in use will be the shadcn-compatible `:root`/`.dark` variables and the `@theme inline` mapping; DaisyUI tokens and plugins will be gone.

## Component inventory and mappings

Legend:
- Dui = DaisyUI classes/components
- Scn = shadcn/ui components

1) Buttons (Dui: `btn`, `btn-primary`, `btn-secondary`, `btn-error`, `btn-ghost`, sizes like `btn-sm`)
   - Scn: `Button` with `variant` and `size` props.
   - Install: `button`.
   - Mapping:
     - `btn btn-primary` -> `<Button variant="default" />` or a custom `primary` variant via `class-variance-authority` if needed to match colors.
     - `btn btn-secondary` -> `<Button variant="secondary" />`.
     - `btn btn-error` -> `<Button variant="destructive" />`.
     - `btn btn-ghost` -> `<Button variant="ghost" />`.
     - `btn-sm` -> `<Button size="sm" />`.

2) Navbar/Menu (Dui: `navbar`, `menu`, `menu-horizontal`, `menu-compact`)
   - Scn: Use `NavigationMenu` (top-level), or simple `<nav>` with `Button`, `Link`, and layout utilities. For smaller menus use `DropdownMenu`.
   - Install: `navigation-menu`, `dropdown-menu`.
   - Mapping:
     - Horizontal links -> `NavigationMenu` with `NavigationMenuList`/`Item` or plain list with shadcn Buttons/Links.

3) Dropdowns (Dui: `dropdown`, `dropdown-end`, `dropdown-content`, `dropdown-toggle` with `<details>/<summary>`)
   - Scn: `DropdownMenu` (Trigger/Content/Item/Separator).
   - Install: `dropdown-menu`.
   - Mapping examples:
     - `WrongNetworkDropdown` -> `DropdownMenu` with trigger Button (variant destructive), Content with `NetworkOptions` and `Disconnect` item.
     - `AddressInfoDropdown` -> Trigger Button (secondary), Content list with Copy Address, View QR, View on Explorer, Switch Network, Disconnect.

4) Modal (Dui: `modal`, `modal-toggle`, `modal-box` via checkbox)
   - Scn: `Dialog`.
   - Install: `dialog`.
   - Mapping:
     - `AddressQRCodeModal` -> `Dialog` with `DialogTrigger` (from a button) and `DialogContent` containing QR code and address.

5) Tooltips (Dui: `tooltip`, `tooltip-secondary`, `tooltip-open`)
   - Scn: `Tooltip`.
   - Install: `tooltip`.
   - Mapping:
     - `FaucetButton` and `EtherInput` wrappers -> `TooltipProvider` + `Tooltip` + `TooltipTrigger`/`TooltipContent`.

6) Inputs (Dui: `input`, `input-ghost`, `bg-base-*` borders)
   - Scn: `Input` and `Label`. For composite inputs use Tailwind utilities + shadcn Input.
   - Install: `input`, optionally `label`.
   - Mapping:
     - `InputBase` container: replace Daisy colors with tokens (`border`, `bg-background`, `text-muted-foreground`). Use `<Input className="h-9" ... />` and custom prefixes/suffixes inside a flex container.

7) Skeleton/Loading (Dui: `skeleton`, `loading loading-spinner`)
   - Scn: `Skeleton` and `Spinner` (use `Loader2` icon from lucide-react with `animate-spin`).
   - Install: `skeleton`.
   - Mapping:
     - Replace skeleton divs with `<Skeleton className="h-6 w-6" />`.
     - Replace loading spinner with `<Loader2 className="h-4 w-4 animate-spin" />`.

8) Badges/Alerts (Dui: `badge`, `alert`, color classes)
   - Scn: `Badge`, `Alert`.
   - Install if/when encountered: `badge`, `alert`.

9) Tabs, Progress, etc.
   - Scn components exist (`tabs`, `progress`), install on demand.

## File-by-file migration notes

- `components/Header.tsx`
  - Replace outer `navbar` div with standard flex classes.
  - Mobile menu: replace `<details className="dropdown">` with `DropdownMenu` or `NavigationMenu` / `Sheet` (for better mobile UX). Recommended: use `NavigationMenu` for the header navigation.
  - Replace menu lists (`menu`, `menu-horizontal`) with `NavigationMenu` or plain `<ul>` with `Link` styled via `button` variants or `NavLink` helper.
  - Action buttons (connect, faucet) -> `Button`.

- `components/Footer.tsx`
  - Replace `btn btn-primary btn-sm` with `<Button size="sm" />`.
  - Replace `menu menu-horizontal` container with plain flex; remove `link` utility in favor of `Underline` via Tailwind (`underline-offset-2 hover:opacity-80`).
  - Replace `SwitchTheme` Daisy classes with shadcn `Switch` and Tailwind icons.

- `components/SwitchTheme.tsx`
  - Replace `toggle`, `swap`, `swap-rotate` with shadcn `Switch` and a labeled button:
    - Install: `switch`.
    - Use `<Switch checked={isDarkMode} onCheckedChange={handleToggle} />` and show Sun/Moon icons.

- `components/scaffold-eth/Balance.tsx`
  - Replace button wrapper with `<Button variant="ghost" size="sm" className="hover:bg-transparent ...">`.
  - Replace loading skeletons with `Skeleton`.

- `components/scaffold-eth/PrivyCustomConnectButton/*`
  - `index.tsx`: replace connect buttons with `Button` variants.
  - `WrongNetworkDropdown.tsx`: `DropdownMenu` with `destructive` Button trigger and items.
  - `AddressInfoDropdown.tsx`: `DropdownMenu` secondary Button trigger; use `DropdownMenuItem` for each action; use `Dialog` for QR modal trigger (remove label+checkbox pattern).
  - `AddressQRCodeModal.tsx`: replace with shadcn `Dialog` pattern.
  - `NetworkOptions.tsx`: replace list item buttons with `DropdownMenuItem`.

- `components/scaffold-eth/Input/*`
  - `InputBase.tsx`: replace Daisy border/background classes with tokens; swap inner `<input>` to shadcn `<Input />` and compose with prefix/suffix.
  - `AddressInput.tsx`: replace skeletons with shadcn `Skeleton`; replace bg/base roundings with tokens; image remains as is.
  - `EtherInput.tsx`: use shadcn `Button` for the toggle, `Tooltip` for hints.

- `components/scaffold-eth/FaucetButton.tsx`
  - Replace tooltip wrapper and spinner with `Tooltip` and `Loader2`.

- `utils/scaffold-eth/notification.tsx`
  - Consider migrating to shadcn `Toast` in future; for now, can keep react-hot-toast. Style tokens should reference CSS vars instead of Daisy classes `bg-base-200`, `text-success`, etc. Create equivalents or swap to Tailwind token classes.

## shadcn/ui components to install
Run in `packages/nextjs` (already initialized):
- button
- dropdown-menu
- dialog
- input
- label (optional)
- tooltip
- skeleton
- navigation-menu (preferred for header) or sheet (optional for slide-over/mobile)
- switch
- badge (later if needed)
- alert (later if needed)
- tabs (later if needed)
- progress (later if needed)

### Install commands
Run these from `packages/nextjs` (zsh):

```bash
# Core set for Phase 1-3 (preferred for this repo)
npx shadcn@latest add button input tooltip skeleton dialog dropdown-menu switch navigation-menu

# Optional extras (add when you reach those steps)
npx shadcn@latest add label badge alert tabs progress

```

## Preserve DaisyUI colors (make shadcn match Daisy)
To keep the app colors identical to the current DaisyUI theme, follow these steps:

1) Keep the light/dark CSS variables currently defined in `packages/nextjs/styles/globals.css` (the `:root` and `.dark` blocks). These contain the color values used by DaisyUI (e.g. `--color-primary`, `--color-base-200`, etc.).

2) Expose those CSS variables to Tailwind by mapping theme colors to CSS variables in `packages/nextjs/tailwind.config.js` (or your workspace Tailwind config). Example:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-content': 'var(--color-primary-content)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        'base-100': 'var(--color-base-100)',
        'base-200': 'var(--color-base-200)',
        'base-300': 'var(--color-base-300)',
        info: 'var(--color-info)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
      },
    },
  },
};
```

3) Ensure shadcn components use Tailwind color tokens (e.g. `bg-primary`, `text-primary-content`) or the CSS variables directly in component props/classes. shadcn's components are just Tailwind-based, so mapping Tailwind colors to your CSS vars keeps appearance identical.

4) Confirm `globals.css`'s `@theme inline { ... }` block (once uncommented) maps the same semantic tokens (background, foreground, input, ring, etc.) so shadcn components that reference `bg-background` / `text-foreground` match Daisy colors.

5) After migration and visual verification, remove the DaisyUI plugin blocks from `globals.css` and the `daisyui` dependency.

Small verification checklist:
- Run the app and visually compare primary, secondary, base backgrounds, and text colors on several pages (Header, Footer, modals, forms).
- If any color differs, use the browser devtools to inspect which CSS variable or tailwind token a component references and update the mapping accordingly.

---

### Make light/dark identical to DaisyUI — concrete steps
The file `packages/nextjs/styles/globals.css` currently contains two sources of theme values: the DaisyUI `@plugin "daisyui/theme"` blocks (light/dark) and a commented shadcn-style `:root` / `.dark` token set. The goal is to preserve the exact color values from DaisyUI and expose them to Tailwind/shadcn.

Do this before removing the DaisyUI plugin blocks:

1) Copy all `--color-*` values from the DaisyUI `@plugin "daisyui/theme" { name: "light" ... }` block into the `:root { ... }` shadcn token block (uncomment the block if it's commented). Example (light):

```css
:root {
  --color-primary: #93bbfb; /* from DaisyUI light */
  --color-primary-content: #212638;
  --color-secondary: #dae8ff;
  --color-base-100: #ffffff;
  /* copy the rest of the --color-* values verbatim */
}
```

2) Copy all `--color-*` values from the DaisyUI `@plugin "daisyui/theme" { name: "dark" ... }` block into the `.dark { ... }` shadcn token block. Example (dark):

```css
.dark {
  --color-primary: #212638; /* from DaisyUI dark */
  --color-primary-content: #f9fbff;
  --color-secondary: #323f61;
  --color-base-100: #385183;
  /* copy the rest of the --color-* values verbatim */
}
```

3) Map those Daisy variables to the shadcn semantic tokens inside the `@theme inline { ... }` block (uncomment and adapt if necessary). For example:

```css
@theme inline {
  --background: var(--color-base-200);
  --foreground: var(--color-base-content);
  --card: var(--color-base-100);
  --card-foreground: var(--color-base-content);
  --primary: var(--color-primary);
  --primary-foreground: var(--color-primary-content);
  --secondary: var(--color-secondary);
  --secondary-foreground: var(--color-secondary-content);
  --muted: var(--color-neutral);
  --muted-foreground: var(--color-neutral-content);
  --accent: var(--color-accent);
  --accent-foreground: var(--color-accent-content);
  --destructive: var(--color-error);
  --border: var(--color-base-300);
  --input: var(--color-base-100);
  --ring: var(--color-primary);
}
```

4) Update `packages/nextjs/tailwind.config.js` (or the workspace-level tailwind config) to expose Tailwind colors that reference those CSS variables. Example:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        'base-100': 'var(--color-base-100)',
        'base-200': 'var(--color-base-200)',
        'base-300': 'var(--color-base-300)',
      },
    },
  },
};
```

5) Ensure shadcn components use the semantic tokens above (they will if you leave `@theme inline` and the `:root`/`.dark` vars present). For any component that still refers to DaisyUI classes like `bg-base-200` or `text-success`, replace those classes with Tailwind tokens that point to the mapped CSS variables (for example `bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, or `bg-[color:var(--color-base-200)]` if you prefer raw var usage).

6) Visual verification: after switching the app to use the `:root`/`.dark` token set, run the app and compare the main UI screens (Header, Footer, Connect flows, modals). Use devtools to inspect computed values and confirm the CSS variables match the original DaisyUI hex values. If any difference appears, adjust the mapping in `@theme inline` or tailwind colors.

7) Remove the `@plugin "daisyui"` and `@plugin "daisyui/theme"` blocks from `globals.css` only after the visual parity is confirmed and components no longer reference DaisyUI classes.

Notes:
- This approach preserves the exact DaisyUI hex values by carrying them into `:root` and `.dark` and then mapping to shadcn/Tailwind tokens — that guarantees visual parity for both light and dark modes.
- If you prefer a one-to-one variable rename, keep the `--color-*` names and map Tailwind tokens directly to them (e.g. `primary: 'var(--color-primary)'`) — both approaches work; the important part is to copy the values exactly before removing DaisyUI.

## Theming and tokens
- Ensure `ThemeProvider` in `app/layout.tsx` wraps the app with `attribute="class"`.
- In `globals.css`, rely on the existing `:root` and `.dark` CSS variable blocks for colors; remove DaisyUI color variables once all references to `bg-base-*`, `text-*` are gone. Replace with Tailwind token classes derived from these CSS vars (already mapped via `@theme inline`).
- Replace `.btn`, `.link` custom styles with shadcn component styling and `underline-offset-2 hover:opacity-80`.

## Incremental rollout plan
1) Install core shadcn pieces: button, input, tooltip, skeleton, dialog, dropdown-menu, switch.
2) Replace Buttons across app (Header/Footer/Connect/Faucet/Button inside inputs).
3) Migrate Dropdowns (WrongNetworkDropdown, AddressInfoDropdown, mobile nav in Header).
4) Migrate Modal (AddressQRCodeModal -> Dialog).
5) Migrate Inputs (InputBase, EtherInput, AddressInput) and Skeletons.
6) Replace SwitchTheme with shadcn Switch; update layout accordingly.
7) Remove DaisyUI-only utilities from components.
8) Remove DaisyUI plugin usage in `globals.css`; keep Tailwind tokens.
9) Remove `daisyui` from dependencies.
10) Run lint/tschecks and visual QA.

## Risks and mitigations
- Functional regressions in dropdown/modal behavior: Prefer shadcn primitives (`Dialog`, `DropdownMenu`, `Sheet`) and a11y-compliant triggers.
- Theming mismatches: rely on CSS vars present and adjust tokens.
- Layout shifts: audit `rounded-box`, `shadow-*`, `bg-base-*` with Tailwind equivalents.

## Acceptance checklist
- No references to DaisyUI classes remain under `packages/nextjs`.
- All menus, modals, and inputs work with keyboard and screen readers.
- `globals.css` no longer imports DaisyUI plugins.
- `daisyui` removed from dependencies; build and lint pass.
