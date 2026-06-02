# FinTrack — Personal Finance App

> Your money. Understood.

A full-stack personal finance mobile app built for the Ethiopian financial reality — dual currency (USD + ETB), AI-powered advisor, and smart cost classification.

## Live Demo
- **Backend API:** https://fintrack-app-full.onrender.com/docs
- **Platform:** Android (iOS coming soon)

## Features
- 💰 Income & expense tracking with fixed/variable/accidental classification
- 💱 Dual currency — USD + ETB with live bank rates and manual black market rate
- 🧠 AI financial advisor powered by Groq (Llama 3)
- 📊 Daily, weekly, monthly reports with charts
- 🎯 Budget limits and savings goals
- 🔐 JWT authentication

## Tech Stack
**Backend:** Python · FastAPI · PostgreSQL · Supabase · pandas · Groq API  
**Frontend:** React Native · Expo · Axios  
**Deployment:** Render (backend) · Supabase (database)

## Getting Started

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npx expo start
```

## About
Built as a portfolio project to demonstrate full-stack mobile development skills.
This app is free and open source — built to open doors, not to make money.

---
Built with passion in Addis Ababa 🇪🇹
