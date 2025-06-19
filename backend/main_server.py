from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
import os
import base64
import functions
import llm_processing

app = FastAPI()
app.mount("/images", StaticFiles(directory="images"), name="images")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImagePayload(BaseModel):
    image: str
    case_id: str

class DeleteImagesPayload(BaseModel):
    filenames: List[str]
    case_id: str

class ProcessImagesPayload(BaseModel):
    case_id: str
    image_ids: List[str]

class GetImagesPayload(BaseModel):
    case_id: str

class ProcessPayload(BaseModel):
    case_id: str
    image_ids: List[str]

active_connections = {}

@app.post("/capture-image")
async def capture_image(payload: ImagePayload):
    # save image in images/<case_id> folder, creating if necessary
    image_data = payload.image.split(",")[1]
    image_data = base64.b64decode(image_data)
    case_dir = os.path.join("images", payload.case_id)
    os.makedirs(case_dir, exist_ok=True)
    image_index = len(os.listdir(case_dir))
    image_path = os.path.join(case_dir, f"Image {str(image_index+1).zfill(2)}.png")
    with open(image_path, "wb") as image_file:
        image_file.write(image_data)

    print(f"Image saved to {image_path}")
    return {"status": "success", "image_path": image_path}

@app.post("/get-images")
async def get_images(payload: GetImagesPayload):
    print(f"Fetching images for case_id: {payload.case_id}")
    images, count = functions.get_image_dict(payload)
    return {"images": images, "count": count}


@app.get("/get-latest-case")
async def get_latest_case():
    case_id = functions.find_latest_case()
    return {"case_id": case_id}


@app.post("/delete-images")
async def delete_images_endpoint(payload: DeleteImagesPayload):
    # Delete selected images
    
    image_list, count = functions.delete_imgs_reindex(payload)
    print(f"Deleted images, new list: {image_list}, count: {count}")
    return {"images": image_list, "count": count}

@app.get("/list-cases")
async def list_cases():
    base_dir = "images"
    case_dirs = [d for d in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, d))]
    return {"cases": case_dirs}

@app.get("/create-new-case")
async def create_new_case():
    case_id = functions.create_new_case()
    return {"case_id": case_id}

@app.post("/process-images")
async def process_images(payload: ProcessImagesPayload):
    llm_response = llm_processing.main(payload)
    return {"response": llm_response}