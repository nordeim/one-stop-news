I can see several tools available:

1. read - Read file contents
2. bash - Execute bash commands
3. edit - Make precise file edits
4. write - Create or overwrite files
5. web_search - Search the web using Perplexity AI, Exa, or Gemini
6. code_search - Search for code examples, documentation, and API references
7. fetch_content - Extract readable content from URLs
8. get_search_content - Retrieve full content from previous web_search or fetch_content calls
9. agent_browser - Browse and interact with websites

Additionally, I see a list of available skills in the project context. These could be considered extensions. Let me list them both clearly.

Actually, I should provide a clear, organized list. Let me structure this as:

1. Core tools
2. Available skills/extensions

I should mention that these skills are located in the skills directory and can be loaded when a task matches their description.

Here's a complete list of what I have available:

Core Tools

┌────────────────────┬──────────────────────────────────────────────────────────────────────────────┐
│ Tool │ Purpose │
├────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ read │ Read file contents (text or images) │
├────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ bash │ Execute bash commands in the current working directory │
├────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ edit │ Make precise, targeted file edits with exact text replacement │
├────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ write │ Create new files or overwrite existing ones │
├────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ web_search │ Search the web using Perplexity AI, Exa, or Gemini │
├────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ code_search │ Search for code examples, documentation, and API references │
├────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ fetch_content │ Extract readable content from URLs, YouTube, GitHub, or local videos │
├────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ get_search_content │ Retrieve full stored content from previous web_search or fetch_content calls │
├────────────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ agent_browser │ Browse and interact with websites via Chrome/Chromium │
└────────────────────┴──────────────────────────────────────────────────────────────────────────────┘

Recommended Skills to Load for this Repo

I can activate these specialized skill files on-demand (they're located under /home/project/onestopnews/.agents/skills/):

### Design & UI

- aesthetic — Design principles, visual hierarchy, micro-interactions
- avant-garde-design-v4 — Luxury/premium anti-generic web design
- frontend-design — Design thinking and web UI components
- super-frontend-design — Master frontend UI/UX (Next.js 16 + Tailwind v4)
- claude-design — High-fidelity design artifacts in HTML

### Frontend Development

- frontend-development — React/TypeScript, MUI v7, TanStack Router, Suspense
- nextjs-react-expert — React & Next.js performance optimization
- nextjs16-tailwind4 — Next.js + Tailwind v4 + Framer Motion luxury builds
- react19-ts6-vite8-tailwindv4-mvp — Modern React MVP scaffolding
- ui-styling — shadcn/ui, Radix, Tailwind, dark mode, accessible components
- scaffold-ui — Anti-generic brutalist React components
- tailwind-patterns — Tailwind CSS v4 patterns and design tokens

### Quality & Testing

- code-review — Receiving and requesting code review feedback
- lint-and-validate — Automatic quality control and static analysis
- e2e-testing-lessons — End-to-end testing, auth, API contracts
- frontend-ui-testing-journey — UI testing, browser automation, troubleshooting
- webapp-testing-journey — Systematic web app testing with browser tools
- browser-testing-with-devtools — DOM inspection, console/network analysis

### Architecture & Planning

- api-and-interface-design — Stable API and interface design
- api-patterns — REST, GraphQL, tRPC, pagination, versioning
- plan-writing — Structured task planning
- incremental-implementation — Delivering changes incrementally
- spec-driven-development — Specs before coding

### DevOps & Deployment

- ci-cd-and-automation — CI/CD pipeline setup
- shipping-and-launch — Production launch checklists
- cloudflare-tunnel — Expose local services via Cloudflare

### Backend & Security

- security-and-hardening — Vulnerability prevention, auth, input validation
- vulnerability-scanner — OWASP 2025, supply chain security

### Research & Context

- context7-docs / context7-mcp — Search curated library documentation
- source-driven-development — Ground implementation in official docs
- librarian — Research open-source libraries with GitHub permalinks

### Operations

- git-workflow-and-versioning — Branching, committing, resolving conflicts
- debugging-and-error-recovery — Systematic root-cause debugging
- performance-optimization — Core Web Vitals, profiling, load times
- clean-code — Concise standards, no over-engineering

────────────────────────────────────────────────────────────────────────────────

To use a skill: Just ask me to load it (e.g., "Load the avant-garde-design-v4 skill"), or mention a task that matches one (e.g., "Create a landing page" will trigger the design skills automatically).
