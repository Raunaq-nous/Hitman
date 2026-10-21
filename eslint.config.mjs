import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Layering from ARCHITECTURE.md (also enforced by tests/unit/architecture.test.ts).
  {
    files: ["src/engine/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{
        regex: "^(?!\\.|@/engine/)",
        message: "src/engine is pure: import only other engine modules. Move I/O or framework code to a domain service and pass plain data in.",
      }] }],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error",
        { selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]", message: "No raw hex colours in components: use a token from src/ui/tokens.css, e.g. var(--text) or the Tailwind class bg-[var(--surface)]." },
        { selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]", message: "No raw hex colours in components: use a token from src/ui/tokens.css, e.g. var(--text) or the Tailwind class bg-[var(--surface)]." },
      ],
    },
  },
  {
    files: ["src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{
        regex: "(^@prisma/client$|/lib/prisma$|/repo(/|$))",
        message: "src/ui never touches the database: fetch through a domain service or route handler and pass DTOs in.",
      }] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "scripts/**",
    "_incoming/**",
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
    ".data/**",
    ".worktrees/**",
    // deliberately bad code used to prove the architecture checks catch it
    "tests/fixtures/arch-bad/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
