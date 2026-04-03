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
