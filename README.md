# Microscope App

This is a no-install lab tool that lets anyone snap microscope images with a phone and see them on a Windows PC in real time.

## Overview

- **backend/**: FastAPI service providing WebSocket signaling and REST endpoints.
- **frontend/**: React application (powered by Vite) for camera and viewer UIs.

## Features

- Phone (camera) and PC (viewer) connect via USB-tethered network.
- WebRTC used for low-latency peer-to-peer video streaming.
- Signaling over WebSocket (`/ws`) for SDP/ICE exchange.
- REST endpoint (`/api/images`) for capturing and processing snapshots.
- Resilient to network changes (USB disconnected/reconnected).

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # on Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:3000 and proxies `/ws` and `/api` to the backend.

## Next Steps

- Implement WebRTC peer connection and UI logic in React.
- Secure CORS and origins for production.
- Add tests, CI, deployment scripts.