# SiteSync Cloud Suite

A full-stack construction and real estate management platform built with React, TypeScript, Supabase, and Three.js.

## Modules

- **SiteSync Vault** – Property portfolio management, ROI calculator, lender portal, compliance tracking
- **SiteSync Build** – Project management, RFIs, submittals, change orders, daily reports, scheduling
- **SiteSync Ops** – Budgets, draw requests, tenant management, work orders, document management
- **Quantum Ledger** – Treasury ledger, milestone tracking, approval workflows
- **AI & Intelligence** – AI agents, analytics, financial simulator, AI assistant
- **Spatial Workbench** – Interactive 3D BIM viewer, floor plan management

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **State**: TanStack React Query
- **3D**: Three.js, @react-three/fiber, @react-three/drei
- **Charts**: Recharts

## Getting Started

```bash
npm install
npm run dev
```

Configure Supabase credentials in `.env`:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```
# SiteSyncOS Cloud Suite

## Project Overview
SiteSyncOS Cloud Suite is a cloud-based platform designed for seamless synchronization and management of various applications and services. Built with TypeScript, React, and modern web technologies.

## Quick Start

### Prerequisites
- Node.js 20+
- npm or bun

### Installation
```bash
# Clone the repository
git clone https://github.com/Mrmuhammad300/sitesyncos-cloud-suite.git
cd sitesyncos-cloud-suite

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run lint` - Run ESLint
- `npm test` - Run Vitest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run preview` - Preview production build

## Project Structure
```
├── src/                    # Source code
├── public/                 # Static assets
├── .github/                # GitHub configuration
│   └── workflows/          # CI/CD workflows
├── supabase/               # Supabase configuration
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── tailwind.config.ts      # Tailwind CSS configuration
```

## Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS + Radix UI
- **Database**: Supabase (PostgreSQL)
- **State Management**: TanStack React Query
- **3D Graphics**: Three.js + React Three Fiber
- **Testing**: Vitest + Playwright
- **Code Quality**: ESLint + TypeScript

## GitHub Environments

### Development Environment
- Automatic deployment on push to main
- Variables: DEV_API_URL, DEV_SUPABASE_URL
- Secrets: SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

### Staging Environment
- Manual approval required
- Variables: STAGING_API_URL, STAGING_SUPABASE_URL
- Secrets: SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

### Production Environment
- Requires code review and approval
- Variables: PROD_API_URL, PROD_SUPABASE_URL
- Secrets: SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

## CI/CD Pipeline

The project includes automated workflows for:
- **Linting**: ESLint checks on every PR
- **Testing**: Vitest and Playwright tests
- **Building**: Vite production builds
- **Deployment**: Staged rollout (Dev → Staging → Production)

## Environment Setup

### Create .env.local
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3000
```

### Services Directory
```bash
# Create services directory structure
mkdir -p services/blender-mcp/addon
mkdir -p services/blender-api

# Install service dependencies
cd services/blender-api
npm install
```

## Configuration Files

### TypeScript Configuration
- `tsconfig.json` - Main TypeScript config
- `tsconfig.app.json` - App-specific settings
- `tsconfig.node.json` - Node.js settings

### Build Configuration
- `vite.config.ts` - Vite bundler settings with optimized chunking
- `tailwind.config.ts` - Tailwind CSS theme and plugins
- `postcss.config.js` - PostCSS processing

## Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and commit: `git commit -am 'Add feature'`
3. Push to GitHub: `git push origin feature/your-feature`
4. Open a Pull Request for review
5. Once approved, merge to main
6. Automatic CI/CD pipeline triggers deployment

## Troubleshooting

### Port Already in Use
```bash
# Vite runs on port 8080 by default
# Change in vite.config.ts if needed
```

### Supabase Connection Issues
- Verify SUPABASE_URL and SUPABASE_ANON_KEY in .env.local
- Check Supabase project settings and API keys
- Ensure RLS policies allow your operations

### Build Failures
```bash
npm run lint          # Check for linting errors
npm test              # Run tests
npm run build:dev    # Build in development mode
```

## Contributing
1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting PR

## License
Private Repository - All rights reserved

## Support
For issues and questions, please use GitHub Issues.

---
*Last updated: 2026-04-04*
