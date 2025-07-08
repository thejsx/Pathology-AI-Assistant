import os
from datetime import date
from sqlalchemy import select, func, delete
from db.models import Image, Case, LLMHistory, ClinicalData, ClinicalDoc
import base64
from uuid import uuid4

async def count_images(case_id: str, session):
    stmt = (
        select(func.count(Image.id))
        .join(Case, Image.case_id == Case.id)
        .where(Case.case_id == case_id)
    )
    result = await session.scalar(stmt)
    return result or 0

async def check_create_case(case_id, user_id, session):

    stmt = select(Case).where(Case.case_id == case_id)
    case = (await session.execute(stmt)).scalar_one_or_none()
    if case is None:
        case = Case(case_id=case_id, user_id=user_id)
        session.add(case)
        await session.commit()
        await session.refresh(case)
    return case

async def image_capture(payload, session):

    image_data = payload.image.split(",")[1]
    image_data = base64.b64decode(image_data)
    case_dir = os.path.join("storage","images", payload.case_id)
    os.makedirs(case_dir, exist_ok=True)

    # Save the image with a unique name
    image_path = os.path.join(case_dir, f"{uuid4().hex}.png")
    with open(image_path, "wb") as image_file:
        image_file.write(image_data)
  
    image = Image(
        filename=os.path.basename(image_path), 
        case_id=payload.case_id, 
        user_id=payload.user_id, 
        rel_path=f"/images/{payload.case_id}/{os.path.basename(image_path)}"
    )

    session.add(image)
    await session.commit()

    return image_path

async def find_latest_case(session):
    # Find the latest case directory based on modification time
    stmt = select(Case).order_by(Case.updated.desc()).limit(1)
    result = await session.execute(stmt)
    latest_case = result.scalar_one_or_none()
    return latest_case.case_id if latest_case else f"{date.today().isoformat()}--01"

async def create_new_case_number(session):
    # Create a new case ID based on today's date and the highest index of existing cases
    today = date.today().isoformat()
    stmt = select(Case).where(Case.case_id.like(f"{today}--%"))
    result = await session.execute(stmt)
    case_dirs = result.scalars().all()
    print(case_dirs)
    if case_dirs:
        highest_index = max(int(d.split('--')[-1]) for d in case_dirs)
        return f"{today}--{str(highest_index + 1).zfill(2)}"
    return f"{today}--01"

async def delete_images(payload, session):
    # Delete images in the database
    stmt = (select(Image).where(Image.case_id == payload.case_id, Image.filename.in_(payload.filenames)))
    images_to_delete = (await session.scalars(stmt)).all()
    for image in images_to_delete:
        await session.delete(image)

    stmt_remaining = (select(Image).where(Image.case_id == payload.case_id).order_by(Image.uploaded))
    remaining_images = (await session.scalars(stmt_remaining)).all()
    await session.commit()

    for filename in payload.filenames:
        try:
            os.remove(os.path.join("storage", "images", payload.case_id, filename))
        except FileNotFoundError:
            print(f"File {filename} not found for deletion.")
    return [{"filename": img.filename, "url": img.rel_path} for img in remaining_images], len(remaining_images)

async def load_history(case_id, user_id, include_user, session):
    stmt = select(LLMHistory).where(LLMHistory.case_id == case_id).order_by(LLMHistory.start_ts)
    if include_user:
        stmt = stmt.where(LLMHistory.case_id == case_id, LLMHistory.user_id == user_id).order_by(LLMHistory.start_ts)
    history = (await session.scalars(stmt)).all()
    print(f"Loaded {len(history)} history entries for case {case_id} and user {user_id}")
    return history 
 
async def clear_selected_history(case_id, user_id, selected_indices, session, summary=None):
    if not selected_indices:
        return

    data = await load_history(case_id, None, False, session)
    if not data:
        return

    entries_to_delete = [data[i] for i in selected_indices if i < len(data)]
    
    if summary and entries_to_delete:
        # Create summary entry
        summ_entry = LLMHistory(
            case_id=case_id,
            user_id=user_id,
            prompt="Summary of LLM history",
            image_count=sum(entry.image_count for entry in entries_to_delete),
            response=summary,
            start_ts=min(entry.start_ts for entry in entries_to_delete if entry.start_ts),
            end_ts=max(entry.end_ts for entry in entries_to_delete if entry.end_ts),
        )
        session.add(summ_entry)
    
    # Delete selected entries
    if entries_to_delete:
        ids_to_delete = [entry.id for entry in entries_to_delete]
        await session.execute(
            delete(LLMHistory).where(LLMHistory.id.in_(ids_to_delete))
        )
    
    await session.commit()

