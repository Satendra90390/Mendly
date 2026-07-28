# Mendly — AI Medical Companion

AI-powered health information platform with medicine search, drug interactions, nearby care finder, and an AI chatbot.

## Features

- **Elix AI Chatbot** — answers questions about diseases, symptoms, medicines, and interactions with streaming responses
- **Medicine Search** — search and browse FDA-approved drugs with details on uses, dosage, side effects, and precautions
- **Medical Conditions** — browse disease profiles with symptoms, causes, treatment, and prevention info
- **Drug Interaction Checker** — check two medicines for conflicts
- **Nearby Hospitals & Pharmacies** — find healthcare facilities by search or current geolocation with directions
- **Emergency Contacts** — country-wise emergency numbers with tap-to-call
- **User Accounts** — email/password and Google OAuth sign-in with profile management
- **Bookmarks (Saved Items)** — save medicines and conditions for quick reference
- **Dark/Light Theme** — toggle between dark and light mode with persistant preference

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | **Next.js 16** (App Router), **React 19**, **TypeScript**, **Tailwind CSS v4** |
| Backend | FastAPI, SQLAlchemy, SQLite (Postgres for production) |
| Auth | JWT + bcrypt, Google OAuth, email/OTP |
| AI | NVIDIA NIM (Llama 3.1 70B) or Google Gemini |
| Data | openFDA Drug Label API |
| Icons | Font Awesome 6.7.2 |
| Deployment | Frontend → Vercel, Backend → Render |

## Project Structure

```
mediguide/
├── frontend/                    # Next.js app
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css      # Theme variables, utility classes, animations
│   │   │   ├── layout.tsx       # Root layout (fonts, providers)
│   │   │   ├── page.tsx         # Landing page + OAuth handler
│   │   │   └── (app)/           # Authenticated routes
│   │   │       ├── layout.tsx   # App shell (navbar, dropdown, mobile nav)
│   │   │       ├── dashboard/   # Dashboard with stats and quick actions
│   │   │       ├── chatbot/     # AI chat interface (streaming SSE)
│   │   │       ├── medicines/   # Medicine search + detail modal
│   │   │       ├── conditions/  # Medical conditions browser
│   │   │       ├── hospitals/   # Nearby hospitals finder
│   │   │       ├── pharmacies/  # Nearby pharmacies finder
│   │   │       ├── emergency/   # Emergency contacts by country
│   │   │       ├── saved/       # Bookmarked items
│   │   │       └── account/     # Profile management + delete account
│   │   ├── components/
│   │   │   ├── providers.tsx    # Composes Theme + Auth providers
│   │   │   ├── theme-provider.tsx
│   │   │   ├── auth-context.tsx
│   │   │   ├── auth-modal.tsx   # Login/signup modal with Google OAuth
│   │   │   ├── landing-page.tsx # Marketing landing page
│   │   │   └── mobile-nav.tsx   # Mobile bottom navigation
│   │   └── lib/
│   │       ├── config.ts        # API base URL (auto-detects localhost vs production)
│   │       ├── api.ts           # Fetch helpers
│   │       └── auth-context.tsx  # Auth state management
│   ├── package.json
│   ├── next.config.ts
│   └── postcss.config.mjs
├── backend/                     # FastAPI backend
│   ├── app/
│   │   ├── main.py              # Routes & middleware
│   │   ├── auth.py              # JWT + password hashing
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── database.py          # DB engine/session
│   │   ├── chatbot.py           # AI chatbot engine
│   │   ├── knowledge_base.py    # Curated disease/drug data
│   │   ├── openfda_client.py    # openFDA API client
│   │   ├── email_service.py     # SMTP email sender
│   │   └── otp_store.py         # In-memory OTP store
│   ├── requirements.txt
│   ├── render.yaml
│   └── .env.example
└── README.md
```

## Local Development

### Backend

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate    # Windows
# source .venv/bin/activate                        # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your keys
uvicorn app.main:app --reload --port 8002
```

API docs: `http://localhost:8002/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend auto-detects localhost and connects to `http://localhost:8002/api`.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Deployment

### Backend (Render)

1. Push repo to GitHub
2. On Render: **New > Web Service**, select repo, root directory `backend`
3. Set environment variables:
   - `JWT_SECRET` — `python -c "import secrets; print(secrets.token_hex(32))"`
   - `FRONTEND_ORIGINS` — your Vercel URL
   - `FRONTEND_URL` — same as above (for OAuth redirects)
   - `DATABASE_URL` — use Render Postgres for production
   - `NVIDIA_API_KEY` — get from [build.nvidia.com](https://build.nvidia.com)

### Frontend (Vercel)

1. On Vercel: **New Project**, select repo, root directory `frontend`
2. Framework: **Next.js**
3. Environment variable: `NEXT_PUBLIC_API_URL` — set to your Render backend URL
4. Deploy

## Theme

The app supports both dark and light themes. Toggle is in the navbar (sun/moon icon). Preference is saved to `localStorage`.

## License

MIT