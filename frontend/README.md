# Mendly — Frontend

Next.js 16 (App Router) frontend for the Mendly AI medical companion.

## Tech

- **Next.js 16** with App Router
- **React 19**
- **TypeScript**
- **Tailwind CSS v4** with CSS custom properties for theming
- **Font Awesome 6.7.2** (CDN)

## Pages

| Route | Page |
|-------|------|
| `/` | Landing page with auth modal |
| `/dashboard` | User dashboard with stats and quick actions |
| `/chatbot` | AI chat interface (streaming SSE) |
| `/medicines` | Medicine search + detail modal |
| `/conditions` | Medical conditions browser |
| `/hospitals` | Nearby hospitals finder |
| `/pharmacies` | Nearby pharmacies finder |
| `/emergency` | Emergency contacts |
| `/saved` | Bookmarked items |
| `/account` | Profile management |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── app/
│   ├── globals.css           # Theme variables, utility classes, animations
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Landing page + OAuth handler
│   └── (app)/                # Authenticated routes
│       ├── layout.tsx        # App shell
│       ├── dashboard/
│       ├── chatbot/
│       ├── medicines/
│       ├── conditions/
│       ├── hospitals/
│       ├── pharmacies/
│       ├── emergency/
│       ├── saved/
│       └── account/
├── components/
│   ├── providers.tsx
│   ├── theme-provider.tsx
│   ├── auth-modal.tsx
│   ├── landing-page.tsx
│   └── mobile-nav.tsx
└── lib/
    ├── config.ts
    ├── api.ts
    └── auth-context.tsx
```

## Deployment

The app is configured for Vercel deployment via `next.config.ts` with `output: "standalone"`.

```bash
npm run build
```