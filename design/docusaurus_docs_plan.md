# Design Plan: Docusaurus Documentation for ihpp

## 1. Objective
Establish a professional, searchable, and structured documentation site using Docusaurus in the `docs/` folder. This will serve as the central source of truth for users (how to use `ihpp`) and developers (how `ihpp` works).

## 2. Information Architecture
The documentation will be split into several logical sections:

### A. Getting Started (User Focus)
- **Introduction**: What is `ihpp`? Why use it over other tools?
- **Installation**: Detailed steps for Binary, `go install`, and Building from Source.
- **Quick Start**: Running your first proxy in 60 seconds.

### B. Features Guide (User Focus)
- **Multi-Proxy Management**: How to create and manage multiple targets.
  - *[Screenshot Placeholder: Proxy Management Dashboard / Create Proxy Modal]*
- **Web UI Dashboard**: Navigating the real-time stream, history, and bookmarks.
  - *[Screenshot Placeholder: Main Dashboard with active traffic stream]*
- **Traffic Inspection**: Decompression, pretty-printing, and header filtering.
  - *[Screenshot Placeholder: Detailed Request/Response Viewer]*
- **Request Builder**: Composing and replaying requests (including multipart/form-data).
  - *[Screenshot Placeholder: Request Builder Form with complex data]*
- **Search & Filtering**: Utilizing FTS5 for deep traffic analysis.
  - *[Screenshot Placeholder: Search interface with filtered results]*
- **Exporting**: `curl` export and TOML configuration management.
  - *[Screenshot Placeholder: Export button and curl code snippet]*

### C. Advanced Usage (Power User Focus)
- **CLI Reference**: Exhaustive list of flags and environment variables.
- **Persistence**: Understanding the SQLite database (`~/.proxy/proxy_logs.db`).
- **Custom Configuration**: Deep dive into `.proxy.config.toml`.

### D. Community & Contribution
- **Development Setup**: How to run in dev mode (`start_dev.sh`).
- **Coding Standards**: Go and React conventions used in the project.
- **Migration Guide**: How to add new DB migrations.

## 3. Implementation Strategy

### Step 1: Docusaurus Initialization
- Initialize Docusaurus in the `docs/` directory (using the classic template with TypeScript).
- Configure `docusaurus.config.ts` with the project name, branding, and GitHub links.

### Step 2: Content Migration & Expansion
- Migrate the high-level content from `README.md`.
- Extract technical details from `design/*.md` files into the "Architecture" section.
- Create new screenshots and GIFs for the Features section.

### Step 3: GitHub Pages Publishing
- **Configuration**: Set `url`, `baseUrl`, `organizationName`, and `projectName` in `docusaurus.config.ts`.
- **Deployment Strategy**: Use GitHub Actions for automated deployment to the `gh-pages` branch.
- **Workflow**: Create `.github/workflows/deploy-docs.yml` to build and deploy on every push to the `master` branch.

### Step 4: Integration
- Add a script `scripts/build_docs.sh` to handle documentation builds.
- Update `README.md` to link to the live documentation URL (e.g., `https://liyu1981.github.io/inspect-http-proxy-plus/`).

## 4. Documentation Structure (`docs/`)
```text
docs/
├── sidebars.ts          # Sidebar configuration
├── docusaurus.config.ts # Site config
├── docs/                # Markdown files
│   ├── intro.md
│   ├── getting-started/
│   │   ├── installation.md
│   │   └── quick-start.md
│   ├── features/
│   │   ├── proxy-management.md
│   │   ├── traffic-inspector.md
│   │   └── request-builder.md
│   ├── advanced/
│   │   ├── cli-reference.md
│   │   └── configuration.md
└── src/                 # Custom React components/pages
```

## 5. Visual Style
- **Theme**: Respect system preference (light/dark mode) by default.
- **Code Blocks**: Syntax highlighting for Go, TypeScript, JSON, and TOML.
- **Admonitions**: Use "Tips" and "Warnings" for proxy configuration gotchas.

## 6. GitHub Actions Workflow (Draft)
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
    paths:
      - 'docs/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Install dependencies
        run: cd docs && pnpm install
      - name: Build and Deploy
        run: |
          cd docs
          pnpm run build
        env:
          USE_SSH: true
          GIT_USER: git
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/build
          publish_branch: gh-pages
```

## 7. Next Steps (Actionable Items)
1. Initialize Docusaurus.
2. Draft the "Getting Started" and "Core Features" pages.
3. Configure GitHub Pages and the deployment workflow.
