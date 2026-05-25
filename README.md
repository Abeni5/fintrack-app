# FinTrack

Personal finance tracking with a React Native mobile app and FastAPI backend.

## Project structure

```
fintrack-app/
├── frontend/          # React Native mobile app
│   ├── src/
│   │   ├── screens/   # App screens
│   │   ├── components/
│   │   └── api/       # Backend API calls
│   └── App.js
├── backend/           # FastAPI Python API
│   ├── venv/          # Python virtual env (local only)
│   ├── routes/
│   ├── models/
│   ├── advisor/       # AI logic
│   └── main.py
└── docs/
```

## Getting started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npx expo start
```

See [docs/](docs/) for more notes.
