from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from datetime import date
import asyncio
import functions
import llm_processing
import pydantic_models as models
from sqlalchemy import select
from db.models import Case, Image, LLMHistory, User
from db.session import get_session
import os


app = FastAPI()
app.mount("/images", StaticFiles(directory="storage/images"), name="images")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
tasks: dict[str, asyncio.Task] = {}
task_lock = asyncio.Lock()

@app.post("/capture-image")
async def capture_image(payload: models.ImagePayload, session = Depends(get_session)):
    print(f"Capturing image for case_id: {payload.case_id}")
    _ = await functions.check_create_case(payload.case_id, payload.user_id, session)

    image_path = await functions.image_capture(payload, session)

    print(f"Image saved to {image_path}")
    return {"status": "success", "image_path": image_path}

@app.post("/get-images")
async def get_images(payload: models.GetImagesPayload, session = Depends(get_session)):
    print(f"Fetching images for case_id: {payload.case_id}")
    if not payload.user_id:
        stmt = select(Image).where(Image.case_id == payload.case_id).order_by(Image.uploaded)
    else:
        stmt = select(Image).where(Image.case_id == payload.case_id, Image.user_id == payload.user_id).order_by(Image.uploaded)
    images = (await session.scalars(stmt)).all()

    image_list = [{"filename": img.filename, "url": img.rel_path} for img in images]
    return {"images": image_list, "count": len(image_list)}


@app.post("/get-latest-case")
async def get_latest_case(session = Depends(get_session)):
    print("Fetching latest case ID")
    case_id = await functions.find_latest_case(session)
    return {"case_id": case_id}


@app.post("/delete-images")
async def delete_images_endpoint(payload: models.DeleteImagesPayload, session = Depends(get_session)):
    # Delete selected images

    image_list, count = await functions.delete_images(payload, session)
    print(f"Deleted images, new list: {image_list}, count: {count}")
    return {"images": image_list, "count": count}

@app.post("/list-cases")
async def list_cases(payload: models.User, session = Depends(get_session)):
    user_id = payload.user_id
    if user_id is None:
        print("Listing all cases")
        stmt = select(Case).order_by(Case.updated.desc())
    else:
        print(f"Listing cases for user_id: {user_id}")
        stmt = (
            select(Case)
            .where(Case.user_id == user_id)
            .order_by(Case.updated.desc())
        )
    cases = (await session.scalars(stmt)).all()
    return {"cases": [case.case_id for case in cases]}

@app.post("/create-new-case")
async def create_new_case(session = Depends(get_session)):
    case_id = await functions.create_new_case_number(session=session)
    return {"case_id": case_id}

@app.post("/query-llm")
async def query_llm(payload: models.QueryLLMPayload, session = Depends(get_session)):
    _ = await functions.check_create_case(payload.case_id, payload.user_id, session)
    user_id = payload.user_id
    async with task_lock:
        old_task = tasks.get(user_id)
        if old_task and not old_task.done():
            old_task.cancel()
        
        new_task = asyncio.create_task(llm_processing.main(payload, session))
        tasks[user_id] = new_task
    try:
        response = await new_task
        print(f"LLM response: {response}")
        return {"response": response}
    except asyncio.CancelledError:
        print(f"LLM query for user {user_id} was cancelled.")
        return {"response": "Query cancelled."}
    finally:
        async with task_lock:
            tasks.pop(user_id, None)
    
@app.post("/cancel-llm-query")
async def cancel_llm(payload: models.CancelLLMPayload):
    user_id = payload.user_id
    async with task_lock:
        active_task = tasks.get(user_id)
        if active_task and not active_task.done():
            active_task.cancel()
            return {"status": "cancelled", "message": f"LLM query for user {user_id} cancelled."}
    return {"status": "no active query found"}

@app.get("/user-settings/{user_id}")
async def get_user_settings(user_id: str, session = Depends(get_session)):
    print(f"Loading user settings for user_id: {user_id}")
    stmt = select(User).where(User.user_id == user_id)
    users = (await session.scalars(stmt)).all()
    settings = users[0].settings if users else {}
    print(f"User settings for {user_id}: {settings}")
    return {"settings": settings}

@app.post("/user-settings/{user_id}")
async def save_user_settings(user_id: str, settings: dict, session = Depends(get_session)):
    stmt = select(User).where(User.user_id == user_id)
    users = (await session.scalars(stmt)).all()
    if not users:
        print(f"No users found for user_id: {user_id}, creating a new user.")
        user = User(user_id=user_id, settings=settings)
        session.add(user)
    else:
        user = users[0]
        user.settings = settings
    await session.commit()
    return {"status": "success"}

@app.post("/append-llm-history")
async def append_llm_history(payload: models.AppendLLMHistoryPayload, session = Depends(get_session)):
    print(f"Appending LLM history for case_id: {payload.case_id} with prompt: {payload.prompt}")
    print(f"payload: {payload}")
    new_entry = LLMHistory(
        case_id=payload.case_id,
        user_id=payload.user_id,
        prompt=payload.prompt,
        image_count=payload.image_count,
        response=payload.response)
    session.add(new_entry)
    await session.commit()
    return {"status": "success", "message": "LLM history entry added."}

@app.post("/llm-history")
async def get_llm_history(payload: models.GetLLMHistoryPayload, session = Depends(get_session)):
    if payload.user_id:
        history = await functions.load_history(payload.case_id, payload.user_id, True, session)
    else:
        history = await functions.load_history(payload.case_id, None, False, session)
    return {"history": history}

@app.post("/clear-llm-history")
async def delete_llm_history(payload: models.DeleteLLMHistoryPayload, session = Depends(get_session)):
    print(f"Clearing LLM history for case_id: {payload.case_id} with selected entries: {payload.selected_history}")
    await functions.clear_selected_history(payload.case_id, payload.user_id, payload.selected_history, payload.summary, session)
    return {"status": "cleared"}
