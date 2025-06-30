from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
import asyncio
import os
import base64
import functions
import llm_processing
import user_settings
import llm_history

app = FastAPI()
app.mount("/images", StaticFiles(directory="storage/images"), name="images")

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

class QueryLLMPayload(BaseModel):
    case_id: str
    image_ids: List[str]
    prompt: str
    effort: str
    options: dict = {}
    class Config:
        extra = "allow"  # Allow any extra fields
        arbitrary_types_allowed = True

class CancelLLMPayload(BaseModel):
    case_id: str

class DeleteLLMHistoryPayload(BaseModel):
    case_id: str
    selected_history: List[int]

class AppendLLMHistoryPayload(BaseModel):
    case_id: str
    prompt: str
    image_count: int
    response: str


active_llm_task = None

active_connections = {}

@app.post("/capture-image")
async def capture_image(payload: ImagePayload):
    # save image in images/<case_id> folder, creating if necessary
    image_data = payload.image.split(",")[1]
    image_data = base64.b64decode(image_data)
    case_dir = os.path.join("storage","images", payload.case_id)
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
    print("Fetching latest case ID")
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
    base_dir = os.path.join('storage', 'images')
    case_dirs = [d for d in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, d))]
    return {"cases": case_dirs}

@app.get("/create-new-case")
async def create_new_case():
    case_id = functions.create_new_case()
    return {"case_id": case_id}

@app.post("/query-llm")
async def query_llm(payload: QueryLLMPayload):
    global active_llm_task
    if active_llm_task and not active_llm_task.done():
        print("An LLM query is in progress, cancelling it.")
        active_llm_task.cancel()
        try:
            await active_llm_task
        except asyncio.CancelledError:
            print("Cancelled the previous LLM task.")
        except Exception as e:
            print(f"Error cancelling previous LLM task: {e}")

    active_llm_task = asyncio.create_task(llm_processing.main(payload))
    try:
        llm_response = await active_llm_task
        return {"response": llm_response}
    except asyncio.CancelledError:
        print("Current LLM task was cancelled.")
        return {"response": "LLM task was cancelled."}
    except Exception as e:
        print(f"Error processing LLM query: {e}")
        return {"response": f"Error processing LLM query: {e}"}

@app.post("/cancel-llm-query")
async def cancel_llm(payload: CancelLLMPayload):
    global active_llm_task
    if active_llm_task and not active_llm_task.done():
        print("Cancelling the current LLM task.")
        active_llm_task.cancel()
        try:
            await active_llm_task
        except asyncio.CancelledError:
            print("Cancelled the LLM task successfully.")
        except Exception as e:
            print(f"Error cancelling LLM task: {e}")
    else:
        print("No active LLM task to cancel.")
    return {"status": "cancelled"}

@app.get("/user-settings/{user_id}")
async def get_user_settings(user_id: str):
    print(f"Loading user settings for user_id: {user_id}")
    settings = user_settings.load_user_settings(user_id)
    return {"settings": settings}

@app.post("/user-settings/{user_id}")
async def save_user_settings(user_id: str, settings: dict):
    user_settings.save_user_settings(user_id, settings)
    return {"status": "success"}

@app.get("/llm-history/{case_id}")
async def get_llm_history(case_id: str):
    return {"history": llm_history.load_history(case_id)}

@app.post("/append-llm-history")
async def append_llm_history(payload: AppendLLMHistoryPayload):
    llm_history.append_entry(payload.case_id, payload.prompt, payload.image_count, payload.response)
    return {"status": "success"}

@app.post("/clear-llm-history")
async def delete_llm_history(payload: DeleteLLMHistoryPayload):
    print(f"Clearing LLM history for case_id: {payload.case_id} with selected entries: {payload.selected_history}")
    await llm_history.clear_history(payload.case_id, payload.selected_history)
    return {"status": "cleared"}
