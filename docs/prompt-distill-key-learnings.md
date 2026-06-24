please meticulously plan to distill from @CLAUDE.md , @README.md , @AGENTS.md and @ACCOMPLISHMENTS.md key learnings and tips that are helpful for coding and troubleshooting any project that uses tech stacks based on the following package info:

```json
{
  "name": "nextjs-postgresql-template",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "dotenv": "^17.3.1",
    "drizzle-orm": "^0.45.2",
    "next": "^16.2.6",
    "pg": "^8.20.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.17",
    "@types/node": "^24.13.1",
    "@types/pg": "^8.18.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "drizzle-kit": "^0.31.10",
    "eslint": "^9.39.4",
    "eslint-config-next": "^16.2.6",
    "postcss": "^8.5.8",
    "tailwindcss": "^4.1.17",
    "typescript": "^5.9.3"
  }
}
```

Task is to meticulously plan to distill key learnings and tips from the CLAUDE.md, README.md, AGENTS.md, and ACCOMPLISHMENTS.md files that are helpful for coding and troubleshooting projects using the tech stack specified in the package.json.
The package.json shows:

- Next.js 16
- React 19
- PostgreSQL (via pg)
- Drizzle ORM (not Prisma)
- Tailwind CSS v4
- TypeScript 5.9+

Start by analyzing the differences between LuxeVerse's tech stack and the package.json tech stack:
LuxeVerse uses:

- Prisma (not Drizzle)
- tRPC
- Zustand
- next-intl
- Auth.js
  The package.json uses:
- Drizzle ORM
- Plain pg driver

So you need to distill learnings that are relevant to Next.js 16 + React 19 + Tailwind CSS v4 + TypeScript + PostgreSQL, while noting where the learnings from LuxeVerse (which uses Prisma) may differ from the Drizzle-based project.

Let us read the CLAUDE.md file first, then create a comprehensive plan to update `DISTILLED-LEARNINGS.md`

Now create the comprehensive distillation, organize by domain and make it practical for the specific tech stack in package.json.
Key domains:

1. Next.js 16 (App Router)
2. React 19
3. Tailwind CSS v4
4. TypeScript strict mode
5. PostgreSQL + Drizzle ORM
6. General patterns

---

# Todos

[✓] Analyze all 4 source files and map learnings to the package.json tech stack
[✓] Create distilled learnings document organized by domain
[✓] Filter out LuxeVerse-specific patterns (Prisma, tRPC, Zustand, next-intl) and adapt to Drizzle/plain pg
[✓] Write the final distillation file
Thinking: Done. Let me provide a concise summary.
Written to DISTILLED-LEARNINGS.md. Here's what was extracted and adapted:
10 sections covering 50+ learnings, filtered from LuxeVerse's Prisma/tRPC/Zustand/next-intl patterns to match your Drizzle/pg stack:
Section
Next.js 16
React 19
Tailwind v4
TypeScript
PostgreSQL + Drizzle
Server/Client
Testing
Error Reference
Anti-Pattern Checklist
