Pathology AI Assistant

A lightweight lab companion that streams live microscope video from your phone to a Windows PC, lets you capture high‑resolution snapshots, attach clinical context, and ask an LLM focused questions about the case—all without installing anything on the phone.

What It Does 
Live stream your phone’s camera to a PC viewer so everyone sees the slide in real time.

One‑click image capture saves labelled PNGs to the current case.

Clinical Data modal keeps specimen details, history, imaging, labs and procedure notes in one place. You can upload PDFs/DOCs and have the LLM summarise them for you.

LLM queries let you select any combination of images + clinical fields and ask GPT‑4 for differentials, checklists, or teaching pearls. Responses are stored in the case history so you can review or clear them later.

User‑savable settings (zoom, rotation, token limits, UI layout) travel with you between sessions.

Quick Start (Local dev)

Clone the repo and open a terminal in the project root.

Backend

cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# add .env with OPENAI_API_KEY and your Postgres creds
alembic upgrade head
uvicorn main_server:app --host 0.0.0.0 --port 8000 \
  --reload \
  --ssl-keyfile ../certs/192.168.215.1+255-key.pem \
  --ssl-certfile ../certs/192.168.215.1+255.pem

Frontend

cd ../frontend
npm install
npm run dev   # https://localhost:3000

Open the pages

Phone (camera): https://<PC‑IP>:3000/?role=phone

PC viewer:       https://localhost:3000/?role=viewer
Accept the self‑signed cert on your phone the first time.

That’s it—streaming should begin automatically.

Day‑to‑Day Workflow

Create or pick a case from the sidebar (date‑stamped like 2025‑08‑04--01).

Capture images while scanning. They appear instantly in the sidebar for selection/deletion.

Add clinical context via the Clinical Data button. Save what matters; upload any outside docs.

Pose an LLM question in the bottom bar. Tick Use selected images and/or Use clinical data as needed. GPT‑4 will answer and log the interaction.

Review history to keep, summarise or purge earlier prompts.

Useful Tips

Drag any modal by its header; positions persist until you refresh.

Resize the bottom bar or column dividers by grabbing their grey handles.

Full‑screen the video, then tweak zoom/rotate/offset in the floating controls.

If phone and PC are on different networks you’ll need a TURN server; otherwise Google STUN is enough.

All files save under storage/ next to the repo—handy for backups.

Requirements

Python 3.11+

Node.js 18+

PostgreSQL 14+ (or compatible)

An OpenAI API key

Going Further

When you’re ready for production you’ll likely swap the self‑signed certs for LetsEncrypt, off‑load storage to S3/Azure, and run the backend behind a process manager like systemd or docker compose. TURN and auth headers are also advisable beyond the lab.