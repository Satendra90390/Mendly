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

## What is Mendly?

Mendly is a free, privacy-first health platform. At its center is **Elix**, an AI health companion that explains symptoms, medicines, and medical terms in plain language.

Every response includes clear disclaimers: **this is educational information, not a diagnosis.**

| The Problem | How Mendly Helps |
|:------------|:-----------------|
| Hard to find reliable health info | AI chatbot answers in plain language |
| No easy way to check drug interactions | Interaction checker with FDA data |
| Can't find nearby care | Location-based hospital & pharmacy finder |
| Scattered health information | Dashboard with tips, news, and vitals tracking |
| Different emergency numbers per country | Country-wise contacts with tap-to-call |

---

## Features

### 🤖 Elix AI Chat
Ask health questions in plain language. Get educational explanations about symptoms, conditions, medicines, and possible next steps. Every response includes medical disclaimers and source references where available.

### 💊 Medicine Guide
Search any medicine by name. See uses, recommended dosage, common side effects, drug interactions, and precautions. Data sourced from openFDA and medical references.

### ⚡ Drug Interaction Checker
Select two medicines and check for potential conflicts. Get clear risk levels (mild, moderate, severe) with explanations and recommended actions.

### 🏥 Nearby Care Finder
Find hospitals, clinics, and pharmacies near you using GPS or city search. View results on an interactive map with filters for facility type. Works worldwide.

### 🚨 Emergency Resources
One-tap access to emergency numbers for 8+ countries with tap-to-call. Includes crisis resources (988 Lifeline, Crisis Text Line), first-aid guidance for common emergencies, and nearby care shortcuts.

### 📊 Health Dashboard
- **Weather-aware wellness** — Daily tips based on your local weather
- **Live health news** — Curated from WHO, Mayo Clinic, CDC, and medical RSS feeds
- **Vitals tracking** — Log and monitor blood pressure, heart rate, blood sugar, temperature, weight, and oxygen levels
- **Medication reminders** — Track what you take and when
- **Food suggestions** — Daily nutrition recommendations based on conditions

### 👤 Personal Health Profile
Set your age, gender, blood type, and health conditions. Elix uses this context to provide more relevant responses. All data stays private and encrypted.

### 🔐 Guest Access
Try Mendly without creating an account. Guests get limited uses per session to explore features before signing up.

---

## Live Demo

| Service | URL |
|:--------|:----|
| 🌐 **Frontend** | [mendlyapp.web.app](https://mendlyapp.web.app) |
| ⚙️ **Backend API** | [mendly-backend-0vyg.onrender.com](https://mendly-backend-0vyg.onrender.com) |
| 📖 **API Docs** | [mendly-backend-0vyg.onrender.com/docs](https://mendly-backend-0vyg.onrender.com/docs) |

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Frontend** | Vanilla HTML, CSS, JavaScript (SPA) |
| **Backend** | Python FastAPI |
| **Database** | MongoDB Atlas |
| **Auth** | JWT with bcrypt password hashing |
| **AI** | NVIDIA NIM API (Llama / DeepSeek models) |
| **Hosting** | Firebase Hosting (frontend), Render (backend) |
| **Styling** | Custom CSS with design tokens, mobile-first |

---

## Project Structure

```
mediguide/
├── frontend/                    # Vanilla HTML/CSS/JS SPA
│   ├── index.html               # Single HTML entry point
│   ├── js/
│   │   └── app.js               # SPA router, all views, features
│   ├── css/
│   │   └── style.css            # Full design system, responsive
│   └── assets/
│       └── icon/                # Logo variants (SVG)
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

## Quick Start

### Prerequisites

- **Node.js** 18+ (for local dev server)
- **Python** 3.12+
- **MongoDB Atlas** (free tier)
- **NVIDIA API Key** (free tier at [build.nvidia.com](https://build.nvidia.com))

### Setup

```bash
# Clone
git clone https://github.com/Satendra90390/Mendly.git
cd Mendly

# Backend
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add your keys
uvicorn app.main:app --reload --port 8002

# Frontend (new terminal)
cd frontend
npx serve . -p 3000
```

Open `http://localhost:3000` in your browser.

---

## Safety & Disclaimers

Mendly is **not** a medical service. It:

- Does **not** diagnose conditions
- Does **not** prescribe treatment
- Does **not** replace a healthcare professional
- Is **not** an emergency service

Every AI response includes: *"Educational information — not a diagnosis. Confirm with a healthcare professional."*

In an emergency, always contact your local emergency services first.

---

## Privacy

- Your health data is protected by authentication and authorization controls
- Only you can access your information
- We do not sell your data
- You can delete your account and all data anytime from Settings
- Guest sessions have limited usage and are not linked to personal identity

---

## License

**MIT License** — Free to use, modify, and distribute.

Copyright © 2026 Mendly

---

<div align="center">

*Built with care using vanilla JS, FastAPI, and MongoDB*

[🐛 Report Bug](https://github.com/Satendra90390/Mendly/issues) · [💡 Request Feature](https://github.com/Satendra90390/Mendly/discussions)

</div>
