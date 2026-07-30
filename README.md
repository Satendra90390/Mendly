# Mendly — AI Medical Companion

AI-powered health information platform with medicine search, drug interactions, nearby care finder, and an AI chatbot.

## Features

- **Elix AI Chatbot** — answers questions about diseases, symptoms, medicines, and interactions with streaming responses
- **Medicine Search** — search and browse FDA-approved drugs with details on uses, dosage, side effects, and precautions
- **Medical Conditions** — browse disease profiles with symptoms, causes, treatment, and prevention info
- **Drug Interaction Checker** — check two medicines for conflicts
- **Nearby Hospitals & Pharmacies** — find healthcare facilities by search or current geolocation with directions
- **Emergency Contacts** — country-wise emergency numbers with tap-to-call
- **User Accounts** — email/password sign-in with profile management
- **Bookmarks (Saved Items)** — save medicines and conditions for quick reference
- **Dark/Light Theme** — toggle between dark and light mode with persistant preference

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | **React 19**, **Vite**, **TypeScript**, **Tailwind CSS v4** |
| Backend | **FastAPI**, **Python**, **MongoDB** (Motor) |
| Auth | JWT + bcrypt |
| AI | NVIDIA NIM |
| Data | openFDA Drug Label API |
| Deployment | Frontend → **Firebase Hosting**, Backend → **Render** |

## Project Structure

```
mediguide/
├── frontend/                    # React + Vite SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth-modal.tsx   # Login/signup modal
│   │   │   ├── landing-page.tsx # Marketing landing page
│   │   │   └── ...
│   │   ├── pages/               # Route pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Chatbot.tsx
│   │   │   ├── Medicines.tsx
│   │   │   ├── Hospitals.tsx
│   │   │   ├── Pharmacies.tsx
│   │   │   ├── Emergency.tsx
│   │   │   ├── Saved.tsx
│   │   │   ├── Account.tsx
│   │   │   └── ...
│   │   └── lib/
│   │       ├── config.ts        # API base URL (auto-detects localhost vs production)
│   │       ├── api.ts           # Fetch helpers
│   │       └── auth-context.tsx  # Auth state management
│   ├── dist/                    # Built output (deployed to Firebase)
│   ├── firebase.json
│   ├── .firebaserc
│   ├── vite.config.ts
│   └── package.json
├── backend/                     # FastAPI backend
│   ├── app/
│   │   ├── main.py              # Routes & middleware
│   │   ├── auth.py              # JWT + password hashing
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── database.py          # MongoDB connection (Motor)
│   │   ├── chatbot.py           # AI chatbot engine
│   │   ├── knowledge_base.py    # Curated disease/drug data
│   │   ├── openfda_client.py    # openFDA API client
│   │   └── ...
│   ├── Dockerfile               # For Cloud Run deployment
│   ├── render.yaml
│   └── requirements.txt
└── README.md
```

## Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://mendlyapp.web.app |
| Backend  | https://mendly-backend-0vyg.onrender.com |
| API Docs | https://mendly-backend-0vyg.onrender.com/docs |

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
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |

## Deployment

### Frontend (Firebase Hosting)

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### Backend (Render)

1. Push repo to GitHub
2. On Render: **New > Web Service**, select repo, root directory `backend`
3. Set environment variables in Render Dashboard:
   - `JWT_SECRET` — `python -c "import secrets; print(secrets.token_hex(32))"`
   - `MONGODB_URI` — your MongoDB connection string
   - `FRONTEND_ORIGINS` — `https://mendlyapp.web.app,https://mendlyapp.firebaseapp.com`
   - `FRONTEND_URL` — `https://mendlyapp.web.app`
   - `NVIDIA_API_KEY` — get from [build.nvidia.com](https://build.nvidia.com)

## Theme

The app supports both dark and light themes. Toggle is in the navbar (sun/moon icon). Preference is saved to `localStorage`.

## License

MIT