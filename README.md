<p align="center">
  <img src="assets/banner.svg" alt="Mendly Banner" width="100%">
</p>

---

## 📋 Contents

- [🌟 Vision](#-vision)
- [✨ Features](#-features)
- [🖥️ Live Demo](#️-live-demo)
- [📊 Repository Activity](#-repository-activity)
- [🏗️ System Architecture](#️-system-architecture)
- [🧠 AI Model](#-ai-model)
- [💾 Memory Architecture](#-memory-architecture)
- [🗺️ Roadmap](#️-roadmap)
- [📁 Project Structure](#-project-structure)
- [🚀 Quick Start](#-quick-start)
- [📖 Usage Guide](#-usage-guide)
- [📦 Deployment](#-deployment)
- [🔧 Development](#-development)
- [❓ FAQ](#-faq)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🌟 Vision

<div align="center">

> *"Bridging the gap between health information and understanding — through conversation, memory, and care."*

</div>

Most health apps either dump raw data on you or lock you into a single feature. **Mendly** bridges the gap — combining **AI conversation**, **drug databases**, **location-based care discovery**, and **personalized health tracking** into one seamless experience.

| The Problem | How Mendly Solves It |
|:------------|:--------------------|
| ❓ Hard to find reliable health info fast | 🤖 AI chatbot answers instantly |
| 💊 No easy way to check drug interactions | ⚡ Interaction checker with FDA data |
| 🏥 Can't find nearby care in emergencies | 📍 Location-based hospital & pharmacy finder |
| 📚 Scattered health bookmarks | 🔖 Save & organize medicines + conditions |
| 🌍 Different emergency numbers per country | 🆘 Country-wise contacts with tap-to-call |

---

## ✨ Features

| Feature | Description |
|:--------|:------------|
| 🤖 **Elix AI Chatbot** | Conversational AI that answers questions about diseases, symptoms, medicines & interactions |
| 💊 **Medicine Search** | Browse FDA-approved drugs — uses, dosage, side effects & precautions |
| 🩺 **Medical Conditions** | Disease profiles with symptoms, causes, treatment & prevention |
| ⚡ **Drug Interaction Checker** | Check two medicines for conflicts & adverse reactions |
| 🏥 **Nearby Hospitals** | Find healthcare facilities by search or geolocation |
| 💊 **Nearby Pharmacies** | Locate pharmacies & medical stores near you |
| 🆘 **Emergency Contacts** | Country-wise emergency numbers with tap-to-call |
| 🔖 **Saved Items** | Bookmark medicines & conditions for quick reference |
| 🌓 **Dark / Light Theme** | Toggle with persistent user preference |
| 🔐 **Auth System** | Secure signup / login with JWT |

---

## 🖥️ Live Demo

| Service | URL |
|:--------|:----|
| 🌐 **Frontend** | [mendlyapp.web.app](https://mendlyapp.web.app) |
| ⚙️ **Backend API** | [mendly-backend-0vyg.onrender.com](https://mendly-backend-0vyg.onrender.com) |
| 📖 **API Docs** | [mendly-backend-0vyg.onrender.com/docs](https://mendly-backend-0vyg.onrender.com/docs) |

---

## 📊 Repository Activity

<div align="center">

[![Last Commit](https://img.shields.io/github/last-commit/Satendra90390/Mendly?color=00bcd4&logo=github)](https://github.com/Satendra90390/Mendly/commits/master)
[![Stars](https://img.shields.io/github/stars/Satendra90390/Mendly?color=00bcd4&logo=github&logoColor=white)](https://github.com/Satendra90390/Mendly/stargazers)
[![Forks](https://img.shields.io/github/forks/Satendra90390/Mendly?color=00bcd4&logo=github&logoColor=white)](https://github.com/Satendra90390/Mendly/forks)
[![Open Issues](https://img.shields.io/github/issues/Satendra90390/Mendly?color=00bcd4&logo=github&logoColor=white)](https://github.com/Satendra90390/Mendly/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/Satendra90390/Mendly?color=00bcd4&logo=github&logoColor=white)](https://github.com/Satendra90390/Mendly/pulls)
[![Repo Size](https://img.shields.io/github/repo-size/Satendra90390/Mendly?color=00bcd4&logo=github&logoColor=white)](https://github.com/Satendra90390/Mendly)
[![License](https://img.shields.io/github/license/Satendra90390/Mendly?color=00bcd4)](LICENSE)
[![Top Language](https://img.shields.io/github/languages/top/Satendra90390/Mendly?color=00bcd4&logo=python&logoColor=white)](https://github.com/Satendra90390/Mendly)

</div>

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph Client["🌐 Client Layer"]
        User([👤 User])
        FE["React + Vite SPA<br/>(Firebase Hosting)"]
    end

    subgraph API["⚙️ API Layer"]
        BE["FastAPI Backend<br/>(Render)"]
        Auth[🔐 JWT Auth]
        Chat[🤖 AI Chatbot Engine]
    end

    subgraph Services["🧩 Service Layer"]
        FDA[📡 openFDA Client]
        KB[📚 Knowledge Base]
        NIM[🧠 NVIDIA NIM API]
        Mem[💾 Memory Manager]
    end

    subgraph Data["🗄️ Data Layer"]
        DB[(MongoDB Atlas)]
    end

    User -->|HTTPS| FE
    FE -->|API Calls| BE
    BE --> Auth
    BE --> Chat
    BE --> FDA
    BE --> KB
    Auth --> DB
    Chat --> Mem
    Mem --> NIM
    Mem --> DB
    KB --> DB
    FDA -->|REST| OpenFDA[🏛️ openFDA]

    style FE fill:#0d2137,color:#fff
    style BE fill:#0d2137,color:#fff
    style Mem fill:#00bcd4,color:#fff
    style DB fill:#0d2137,color:#fff
    style NIM fill:#0d2137,color:#fff
```

---

## 🧠 AI Model

| Attribute | Detail |
|:----------|:-------|
| **Provider** | [NVIDIA NIM](https://build.nvidia.com) |
| **Models** | Llama 3.3 Nemotron, DeepSeek variants |
| **Role** | Health Q&A, symptom guidance, medicine info, emotional support |
| **Prompt Strategy** | System-prompted with medical disclaimer, context-aware memory injection |
| **Fallback** | Local knowledge base for offline / common queries |
| **Temperature** | 0.3 (factual) — 0.7 (conversational) |

### Inference Flow

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Frontend
    participant BE as Backend
    participant MEM as Memory
    participant NIM as NVIDIA NIM
    participant DB as MongoDB

    U->>FE: Types a message
    FE->>BE: POST /chat
    BE->>MEM: Fetch conversation history
    MEM->>DB: Retrieve past sessions
    DB-->>MEM: Session summaries + context
    MEM-->>BE: Assembled memory context
    BE->>BE: Construct system prompt
    BE->>NIM: API call with context
    NIM-->>BE: Streamed response
    BE->>MEM: Save response to history
    BE-->>FE: Stream tokens
    FE-->>U: Display response
```

---

## 💾 Memory Architecture

Mendly uses a **hybrid memory system** that balances conversation continuity with token efficiency.

### Memory Layers

| Layer | Scope | Storage | Retention |
|:------|:------|:--------|:----------|
| 🟢 **Working Memory** | Current session messages | In-memory (Python dict) | Session lifetime |
| 🔵 **Episodic Memory** | Recent conversations | MongoDB — `sessions` collection | 30 days |
| 🟡 **Summarized Memory** | Compressed long-term history | MongoDB — `memory_summaries` collection | Indefinite |
| 🔴 **Profile Memory** | User preferences + saved items | MongoDB — `users` collection | Until changed |

### How Memory Works

```mermaid
graph LR
    subgraph Online["🟢 Working (In-Memory)"]
        WM[Session Messages]
    end

    subgraph Recent["🔵 Episodic (MongoDB)"]
        EM[Recent Sessions<br/>24h window]
    end

    subgraph Long["🟡 Summarized (MongoDB)"]
        SM[Compressed Summaries<br/>Key topics + mood]
    end

    subgraph Profile["🔴 Profile (MongoDB)"]
        PM[User Profile<br/>Saved Items + Prefs]
    end

    WM -->|Flush on session end| EM
    EM -->|Summarize every N sessions| SM
    PM -->|Inject on login| WM

    style WM fill:#00bcd4,color:#fff
    style EM fill:#0d2137,color:#fff
    style SM fill:#0d2137,color:#fff
    style PM fill:#0d2137,color:#fff
```

### Context Assembly

When a user sends a message, the backend assembles context in this priority:

1. **System prompt** — Role, boundaries, medical disclaimer
2. **User profile** — Name, saved items, preferences
3. **Recent memory** — Last 10-20 messages from current session
4. **Summarized history** — Compressed key topics from past sessions
5. **Knowledge base** — Relevant disease/drug info if detected
6. **Current message** — The user's latest input

> This keeps responses **context-aware** without exceeding the model's token window.

---

## 🗺️ Roadmap

```mermaid
gantt
    title Mendly Development Roadmap
    dateFormat  YYYY-MM-DD
    section Core
    AI Chatbot v1           :done, 2025-01-01, 2025-03-01
    Medicine Search         :done, 2025-02-01, 2025-04-01
    Drug Interaction Checker:done, 2025-03-01, 2025-05-01
    Nearby Hospitals        :done, 2025-04-01, 2025-06-01

    section Current
    Firebase Migration      :active, 2025-06-01, 2025-08-01
    Memory System v2        :active, 2025-07-01, 2025-09-01

    section Upcoming
    Long-term Summaries     :2025-08-01, 2025-10-01
    Habit & Mood Tracking   :2025-09-01, 2025-11-01
    Mobile App (Capacitor)  :2025-10-01, 2025-12-01
    Community Discussions   :2025-11-01, 2026-01-01
    Crisis Detection        :2025-12-01, 2026-02-01
```

### ✅ Completed
- [x] AI chatbot with NVIDIA NIM integration
- [x] Medicine search via openFDA API
- [x] Drug interaction checker
- [x] Nearby hospitals & pharmacies (geolocation)
- [x] Emergency contacts database
- [x] Saved items / bookmarks
- [x] Dark / light theme toggle
- [x] JWT authentication

### 🔄 In Progress
- [ ] Firebase Hosting migration
- [ ] Memory system v2 (long-term summarization)
- [ ] UI / UX polish

### 📅 Planned
- [ ] Long-term conversation memory (summarization)
- [ ] Habit & mood correlation detection
- [ ] Mobile app via Capacitor
- [ ] Anonymous community discussions
- [ ] Crisis detection & escalation
- [ ] Offline mode (PWA)
- [ ] Multi-language support

---

## 📁 Project Structure

```
mediguide/
├── frontend/                          # React + Vite SPA
│   ├── src/
│   │   ├── components/                # Reusable UI components
│   │   │   ├── auth-modal.tsx         # Login / signup modal
│   │   │   ├── landing-page.tsx       # Marketing landing
│   │   │   └── ...
│   │   ├── pages/                     # Route pages
│   │   │   ├── Home.tsx               # Landing
│   │   │   ├── Dashboard.tsx          # User dashboard
│   │   │   ├── Chatbot.tsx            # AI chat
│   │   │   ├── Medicines.tsx          # Medicine search
│   │   │   ├── Conditions.tsx         # Disease browser
│   │   │   ├── Hospitals.tsx          # Nearby hospitals
│   │   │   ├── Pharmacies.tsx         # Nearby pharmacies
│   │   │   ├── Emergency.tsx          # Emergency contacts
│   │   │   ├── Saved.tsx              # Bookmarks
│   │   │   └── Account.tsx            # Profile management
│   │   └── lib/
│   │       ├── config.ts              # API base URL
│   │       ├── api.ts                 # Fetch helpers
│   │       └── auth-context.tsx       # Auth state
│   ├── public/
│   ├── dist/                          # → Firebase Hosting
│   ├── firebase.json
│   ├── .firebaserc
│   └── package.json
│
├── backend/                           # FastAPI backend
│   ├── app/
│   │   ├── main.py                    # Routes, CORS, middleware
│   │   ├── auth.py                    # JWT, password hashing
│   │   ├── schemas.py                 # Pydantic models
│   │   ├── database.py                # MongoDB (Motor)
│   │   ├── chatbot.py                 # AI engine
│   │   ├── knowledge_base.py          # Curated data
│   │   └── openfda_client.py          # FDA API client
│   ├── Dockerfile
│   ├── render.yaml
│   ├── requirements.txt
│   └── .env.example
│
├── scripts/
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Link |
|:------------|:--------|:-----|
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| Python | 3.12+ | [python.org](https://www.python.org/) |
| MongoDB | Atlas (free tier) | [mongodb.com/atlas](https://www.mongodb.com/atlas) |
| NVIDIA API Key | — | [build.nvidia.com](https://build.nvidia.com) |

### Setup

```bash
# 1. Clone
git clone https://github.com/Satendra90390/Mendly.git
cd Mendly

# 2. Backend
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8002

# 3. Frontend
cd ../frontend
npm install
npm run dev
```

> 📖 API docs at `http://localhost:8002/docs`  
> 🌐 App at `http://localhost:3000`

---

## 📖 Usage Guide

```mermaid
flowchart LR
    A[🔐 Create Account] --> B[📊 Dashboard]
    B --> C[💬 Chat with Elix AI]
    B --> D[💊 Search Medicines]
    B --> E[📍 Find Nearby Care]
    C --> F["Ask health<br/>questions"]
    D --> G[⚡ Check Interactions]
    E --> H[🏥 Hospitals / 💊 Pharmacies]
```

| Feature | Location | How To Use |
|:--------|:---------|:-----------|
| 💬 **AI Chat** | Sidebar → Chat | Type your health question |
| 💊 **Medicines** | Sidebar → Medicines | Search by name or condition |
| ⚡ **Interactions** | Medicines → Checker tab | Select two drugs to compare |
| 🏥 **Hospitals** | Sidebar → Hospitals | Allow location or search city |
| 🆘 **Emergency** | Sidebar → Emergency | Pick country → tap to call |
| 🔖 **Saved** | Sidebar → Saved | Bookmark from any medicine page |

---

## 📦 Deployment

### Frontend → Firebase Hosting

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### Backend → Render

1. Push repo to GitHub
2. On [Render](https://render.com): **New > Web Service**
3. Connect repo, root directory = `backend`
4. Set required env vars in Render Dashboard
5. Deploy

> 🔗 Live at **mendlyapp.web.app** + **mendly-backend-0vyg.onrender.com**

---

## 🔧 Development

| Command | What It Does |
|:--------|:-------------|
| `npm run dev` | 🔥 Start Vite dev server (port 3000) |
| `npm run build` | 📦 Production build → `frontend/dist/` |
| `npm run preview` | 👁️ Preview production build locally |

### Conventions

| Area | Convention |
|:-----|:-----------|
| **Frontend** | TypeScript, React functional components, Tailwind |
| **Backend** | Python FastAPI, async/await, Pydantic validation |
| **HTTP** | Native `fetch()` — no Axios |
| **Auth** | JWT in `Authorization: Bearer <token>` header |
| **API** | JSON, RESTful routes |

---

## ❓ FAQ

| Question | Answer |
|:---------|:-------|
| **Is Mendly a real medical service?** | No. Mendly is an experimental software project for informational purposes. It does not provide diagnosis, treatment, or professional medical advice. |
| **Can I use Mendly in an emergency?** | No. If you are experiencing a medical emergency, call your local emergency services immediately. Mendly's emergency section provides contact numbers only. |
| **Is my data private?** | Conversation data is stored in MongoDB Atlas. We do not share or sell your data. For full details, see our privacy policy. |
| **Do I need an API key?** | To run the backend locally, yes — you need an NVIDIA NIM API key (free tier available). The live demo is pre-configured. |
| **What AI model powers the chatbot?** | Mendly uses NVIDIA NIM with Llama 3.3 Nemotron / DeepSeek models, fine-tuned via system prompts for health information. |
| **Can I contribute?** | Absolutely! See the [Contributing](#-contributing) section. |
| **Why the name "Mendly"?** | *Mend* (to heal/fix) + *-ly* (friendly/serene) — a friendly companion for your health journey. |

---

## 🤝 Contributing

```mermaid
flowchart LR
    A[Fork] --> B[Branch]
    B --> C[Code]
    C --> D[Commit]
    D --> E[Push]
    E --> F[Open PR]
    F --> G[Review]
    G --> H[Merge 🎉]
```

| Principle | Guideline |
|:----------|:----------|
| 🔒 **Security** | Never commit secrets or API keys |
| 🧪 **Testing** | Verify changes locally before PR |
| 📚 **Docs** | Update README for new features |
| 🎨 **UI/UX** | Follow existing component patterns |

---

## 📄 License

**MIT License** — Free to use, modify, and distribute.

Copyright © 2025 Mendly

---

<div align="center">

*Built with ❤️ using React, FastAPI & NVIDIA NIM*

[🐛 Report Bug](https://github.com/Satendra90390/Mendly/issues) · [💡 Request Feature](https://github.com/Satendra90390/Mendly/discussions)

</div>
