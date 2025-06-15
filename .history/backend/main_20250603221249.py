from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

connections: list[WebSocket] = []

class ImagePayload(BaseModel):
    image: str

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            for conn in connections:
                if conn is not websocket:
                    await conn.send_json(data)
    except WebSocketDisconnect:
        connections.remove(websocket)

@app.post("/api/images")
async def capture_image(payload: ImagePayload):
    return {"status": "received"}