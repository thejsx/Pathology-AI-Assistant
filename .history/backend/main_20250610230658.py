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
            data = await websocket.receive_json()
            target = data.get("target")
            if target:
                data_dict = {key: val for key, val in data.items() if key != 'data'}
                print( f"Message from {client_id} to target {data_dict}")
                for conn in connections:
                    if conn['id'] == target:
                        await conn['ws'].send_json(data)
                        break
            else:
                data_dict = {key: val for key, val in data.items() if key != 'data'}
                print(f"Message from {client_id} (broadcast): {data_dict})")
                # Broadcast to all connections if no target is specified
                for conn in connections:

                    if conn['ws'] != websocket:


                        await conn['ws'].send_json(data)
    except WebSocketDisconnect:
        print(f"Client {client_id} disconnected")
        connections[:] = [conn for conn in connections if conn['ws'] != websocket]
        await websocket.close()

@app.post("/api/images")
async def capture_image(payload: ImagePayload):
    return {"status": "received"}