from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from uuid import uuid4

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

connections: list[dict] = []

class ImagePayload(BaseModel):
    image: str

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    client_id = str(uuid4())
    print(f"Client {client_id} connected")
    connections.append({ 'id': client_id, 'ws': websocket })
    await websocket.send_json({"type": "id", "id": client_id})
    try:
        while True:
            print(f"Waiting for message from client {client_id}")
            data = await websocket.receive_json()
            print(f"Received message from client {client_id}: {data}")
            target = data.get("target")
            print(f"Target for message: {target}")
            if target:
                for conn in connections:
                    if conn['id'] == target:
                        await conn['ws'].send_json(data)
                        break
            else:
                # Broadcast to all connections if no target is specified
                for conn in connections:
                    if conn['ws'] != websocket:
                        await conn['ws'].send_json(data)
    except WebSocketDisconnect:
        print(f"Client {client_id} disconnected")
        connections[:] = [conn for conn in connections if conn['ws'] != websocket]

@app.post("/api/images")
async def capture_image(payload: ImagePayload):
    return {"status": "received"}