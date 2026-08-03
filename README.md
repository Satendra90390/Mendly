<p align="center">
  <img src="assets/banner.svg" alt="Mendly Banner" width="100%">
</p>

<p align="center">
  <img src="assets/icon/mendly-icon-full-dark-bg.svg" alt="Mendly Logo" width="120" style="border-radius: 24px;">
</p>

<h1 align="center">Mendly</h1>

<p align="center">
  <strong>Your personal health platform</strong><br>
  Understand health topics, explore medicines, find nearby care, and track your health.
</p>

<p align="center">
  <a href="https://mendlyapp.web.app">Website</a> ·
  <a href="https://mendlyapp.web.app/#chat">Try Elix</a> ·
  <a href="https://mendly-backend-0vyg.onrender.com/docs">API Docs</a>
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
- [🗺️ Roadmap](#-roadmap)
- [📁 Project Structure](#-project-structure)
- [🚀 Quick Start](#-quick-start)
- [📖 Usage Guide](#-usage-guide)
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
| 🔐 **Auth System** | Secure signup / login with JWT |
| 📱 **Works Everywhere** | Responsive design that works on desktop, tablet, and mobile |

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
    subgraph Client["📱 Client Layer"]
        User([👤 User])
        FE["Vanilla JS SPA<br/>(Firebase Hosting)"]
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

    User -->|API Calls| FE
    FE --> BE
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
    Firebase Hosting        :active, 2025-06-01, 2025-08-01
    Memory System v2        :active, 2025-07-01, 2025-09-01

    section Upcoming
    Long-term Summaries     :2025-08-01, 2025-10-01
    Habit & Mood Tracking   :2025-09-01, 2025-11-01
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
- [x] JWT authentication
- [x] Firebase Hosting migration
- [x] Responsive SPA (desktop + mobile)

### 🔄 In Progress
- [ ] Memory system v2 (long-term summarization)
- [ ] UI / UX polish

### 📅 Planned
- [ ] Habit & mood correlation detection
- [ ] Anonymous community discussions
- [ ] Crisis detection & escalation
- [ ] Offline mode (PWA)
- [ ] Multi-language support

---

## 📁 Project Structure

```
mediguide/
├── frontend/                    # Vanilla HTML/CSS/JS SPA
│   ├── index.html               # Single HTML entry point
│   ├── js/
│   │   └── app.js               # SPA router, all views, features
│   ├── css/
│   │   └── style.css            # Full design system, responsive
│   ├── assets/
│   │   └── icon/                # Logo variants (SVG)
│   ├── manifest.json            # PWA manifest
│   └── sw.js                    # Service worker
│
├── backend/                     # FastAPI backend
│   ├── app/
│   │   ├── main.py              # Routes, CORS, security headers
│   │   ├── auth.py              # JWT, bcrypt, user dependencies
│   │   ├── chatbot.py           # AI chat engine
│   │   ├── knowledge_base.py    # Disease/medicine data
│   │   └── openfda_client.py    # FDA API client
│   ├── requirements.txt
│   └── .env
│
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
cp .env.example .env  # add your keys
uvicorn app.main:app --reload --port 8002

# 3. Frontend (new terminal)
cd frontend
npx serve . -p 3000
```

> 📖 API docs at `http://localhost:8002/docs`
> 🌐 Open `http://localhost:3000` in your browser

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

## 🔧 Development

| Command | What It Does |
|:--------|:-------------|
| `npx serve . -p 3000` | Start local dev server |
| `uvicorn app.main:app --reload --port 8002` | Start backend with hot reload |

### Conventions

| Area | Convention |
|:-----|:-----------|
| **Frontend** | Vanilla HTML, CSS, JavaScript — single-file SPA |
| **Backend** | Python FastAPI, async/await, Pydantic validation |
| **HTTP** | Native `fetch()` — no Axios |
| **Auth** | JWT in `Authorization: Bearer <token>` header |
| **API** | JSON, RESTful routes |
| **Styling** | CSS custom properties, mobile-first, design tokens |

---

## ❓ FAQ

| Question | Answer |
|:---------|:-------|
| **Is Mendly a real medical service?** | No. Mendly is an experimental software project for informational purposes. It does not provide diagnosis, treatment, or professional medical advice. |
| **Can I use Mendly in an emergency?** | No. If you are experiencing a medical emergency, call your local emergency services immediately. Mendly's emergency section provides contact numbers only. |
| **Is my data private?** | Conversation data is stored in MongoDB Atlas. We do not share or sell your data. |
| **Do I need an API key?** | To run the backend locally, yes — you need an NVIDIA NIM API key (free tier available). The live demo is pre-configured. |
| **What AI model powers the chatbot?** | Mendly uses NVIDIA NIM with Llama 3.3 Nemotron / DeepSeek models, fine-tuned via system prompts for health information. |
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

Copyright © 2026 Mendly

---

<div align="center">

*Built with care using vanilla JS, FastAPI, and MongoDB*

[🐛 Report Bug](https://github.com/Satendra90390/Mendly/issues) · [💡 Request Feature](https://github.com/Satendra90390/Mendly/discussions)

</div>
