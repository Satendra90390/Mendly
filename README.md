# Mendly

AI-powered medicine and health information platform.

## Features

- **Elix AI Chatbot** — answers questions about diseases, symptoms, medicines, and interactions
- **Medicine Search** — live data from the openFDA drug label database (any FDA-approved drug)
- **Disease Profiles** — curated info on 18+ conditions with symptoms, causes, and treatments
- **Drug Interaction Checker** — check two medicines for conflicts
- **Nearby Care Finder** — locate hospitals and pharmacies by name or current location
- **Emergency Contacts** — country-wise emergency numbers
- **User Accounts** — email/phone/Google sign-in, profile with blood type and DOB
- **Chat History & Bookmarks** — saved searches and per-user conversation log

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, SQLAlchemy, SQLite (Postgres for production) |
| Frontend | Vanilla HTML, CSS, JavaScript (no framework) |
| Auth | JWT + bcrypt, Google OAuth, email/phone OTP |
| AI | NVIDIA NIM (Llama 3.1 70B) or Google Gemini |
| Data | openFDA Drug Label API |

## Project Structure

```
mediguide/
├── backend/
│   ├── app/
│   │   ├── main.py            API routes & middleware
│   │   ├── auth.py            JWT + password hashing
│   │   ├── models.py          SQLAlchemy models
│   │   ├── schemas.py         Pydantic schemas
│   │   ├── database.py        DB engine/session
│   │   ├── chatbot.py         AI chatbot engine
│   │   ├── knowledge_base.py  Curated disease/drug data
│   │   ├── openfda_client.py  openFDA API client
│   │   ├── email_service.py   SMTP email sender
│   │   └── otp_store.py       In-memory OTP store
│   ├── requirements.txt
│   ├── render.yaml
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── styles.css
│   ├── config.js
│   ├── auth.js
│   ├── app.js
│   ├── logo.svg
│   └── vercel.json
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
uvicorn app.main:app --reload --port 8002
```

API docs: `http://localhost:8002/docs`

### Frontend

```bash
cd frontend
python -m http.server 5500
```

Open `http://localhost:5500`. The frontend auto-detects localhost and connects to the backend.

## Deployment

### Backend (Render)

1. Push repo to GitHub
2. On Render: **New > Web Service**, select repo, root directory `backend`
3. Set environment variables:
   - `JWT_SECRET` — `python -c "import secrets; print(secrets.token_hex(32))"`
   - `FRONTEND_ORIGINS` — your Vercel URL (e.g. `https://mendly.vercel.app`)
   - `FRONTEND_URL` — same as above (for OAuth redirects)
   - `DATABASE_URL` — use Render Postgres for production
   - `NVIDIA_API_KEY` — get from [build.nvidia.com](https://build.nvidia.com)

### Frontend (Vercel)

1. On Vercel: **New Project**, select repo, root directory `frontend`
2. Framework: **Other** (static files)
3. Edit `frontend/config.js` — replace the placeholder URL with your Render backend URL
4. Deploy

### After deploying both

- Set `FRONTEND_ORIGINS` on backend to your exact Vercel URL
- Update `config.js` with your actual backend URL
- Redeploy both

## License

MIT
