from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
from dotenv import load_dotenv
import os
import base64

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImagePayload(BaseModel):
    image: str

active_connections = {}

@app.post("/capture-image")
async def capture_image(payload: ImagePayload):
    # save image in images folder
    image_data = payload.image.split(",")[1]
    image_data = base64.b64decode(image_data)
    image_index = len(os.listdir("images"))
    image_path = os.path.join("images", f"captured_image{image_index+1}.png")
    with open(image_path, "wb") as image_file:
        image_file.write(image_data)
    
    print(f"Image saved to {image_path}")
    return {"status": "success", "image_path": image_path}

@app.get("/get-images")
async def get_images():
    images = os.listdir("images")
    image_list = []
    for image in images:
        image_list.append({
            "filename": image,
            "url": f"/images/{image}",
            "path": os.path.join("images", image)
        })
    print(f"Retrieved {len(images)} images.")
    print(f"Image list: {image_list}")
    return {"images": image_list, "count": len(images)}