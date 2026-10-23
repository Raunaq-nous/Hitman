// Browser chrome (theme-color meta, manifest) needs literal colours. These mirror src/ui/tokens.css
// (--snow for light, --bg for dark); tests/unit/ui/tokens.test.ts keeps them in sync.
export const THEME_COLOR = { light: "#F5F7FA", dark: "#0C1626" } as const;
