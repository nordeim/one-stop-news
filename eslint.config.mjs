import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    // "e2e/**" has been removed from this array
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "dist/**",
      "playwright.config.ts",
      "skills/**",
      "docs/**",
      "coverage/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // ── Phase 19+ remediation (Batch 4 / H1) ─────────────────────────────────
  // Domain layer purity rule: src/domain/** may import from @/lib/db only via
  // `import type` (compile-time-only, erased at build — no runtime coupling).
  // Runtime imports from @/lib/db would create a circular dependency:
  //   domain → lib/db → schema (which is fine) → BUT also lib/db → postgres
  //   (which connects to the database at module load).
  // Keeping domain layer runtime-pure means it can be unit-tested without
  // a database connection and reused in non-Next.js contexts (workers, CLI).
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db",
              message:
                "Runtime imports from @/lib/db are forbidden in src/domain/**. Use `import type { ... } from '@/lib/db/schema'` instead — type-only imports are erased at compile time and create no runtime coupling. This keeps the domain layer pure and unit-testable without a database connection. See AGENTS.md §Phase 19+ / P1 for rationale.",
              allowTypeImports: true,
            },
            {
              name: "@/lib/db/schema",
              message:
                "Runtime imports from @/lib/db/schema are forbidden in src/domain/**. Use `import type { ... } from '@/lib/db/schema'` instead — type-only imports are erased at compile time and create no runtime coupling. See AGENTS.md §Phase 19+ / P1 for rationale.",
              allowTypeImports: true,
            },
            {
              name: "@/lib/db/index",
              message:
                "Runtime imports from @/lib/db/index are forbidden in src/domain/**. The domain layer must be pure (no DB client access). See AGENTS.md §Phase 19+ / P1 for rationale.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
];
