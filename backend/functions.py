import os, json, base64
from datetime import date
from sqlalchemy import select, func, delete
from db.models import Image, Case, LLMHistory, ClinicalData, ClinicalDoc
from uuid import uuid4

async def count_images(case_id: str, session):
    stmt = (
        select(func.count(Image.id))
        .join(Case, Image.case_id == Case.id)
        .where(Case.case_id == case_id)
    )
    result = await session.scalar(stmt)
    return result or 0

# Check if a case exists, create it if not
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

# ─────────────────────── clinical data ─────────────────────

def _ensure_clinical_dir(case_id: str) -> str:
    """return …/storage/clinical/<case_id>/  (creates if missing)"""
    path = os.path.join("storage", "clinical", case_id)
    os.makedirs(path, exist_ok=True)
    return path

async def get_clinical_data(case_id: str, session):
    row = await session.scalar(select(ClinicalData).where(ClinicalData.case_id == case_id))
    if row is None:
        # create default row but don't save it
        row = ClinicalData(case_id=case_id, specimen={"summary": "No specimen data available.", "details": {}, "date": None}, summary="No summary data", procedure="No procedure data", pathology="No pathology data", imaging="No imaging data", labs="No laboratory data")

    return {
        "specimen":  row.specimen,
        "summary":   row.summary,
        "procedure": row.procedure,
        "pathology": row.pathology,
        "imaging":   row.imaging,
        "labs":      row.labs,
    }

async def update_clinical_fields(case_id: str, fields: dict, session):
    row = await session.scalar(select(ClinicalData).where(ClinicalData.case_id == case_id))
    if row is None:
        row = ClinicalData(case_id=case_id)
        session.add(row)

    for k, v in fields.items():
        if hasattr(row, k):
            if isinstance(v, str):
                setattr(row, k, v.strip())
            else:
                setattr(row, k, v)
    await session.commit()
    return await get_clinical_data(case_id, session)

# ───────────────────── clinical documents ─────────────────
async def list_clinical_documents(case_id: str, session) -> int:
    rows = await session.scalars(select(ClinicalDoc).where(ClinicalDoc.case_id == case_id))
    return [{"title": row.title, "url": row.location} for row in rows]

async def save_clinical_document(case_id: str, user_id: str,
                                 filename: str, data_url: str, session):
    docs_dir = _ensure_clinical_dir(case_id)
    # ensure unique filename
    if filename in os.listdir(docs_dir):
        end_num = filename.split("_")[-1]
        if end_num.isdigit():
            end_num = int(end_num) + 1
            filename = f"{filename.rsplit('_', 1)[0]}_{end_num:02d}"
        else:
            filename = f"{filename}_01"
   
    full_path = os.path.join(docs_dir, filename)

    # strip possible data‑URL prefix & decode
    b64 = data_url.split(",")[-1]
    with open(full_path, "wb") as fh:
        fh.write(base64.b64decode(b64))

    rel_path = f"/clinical/{case_id}/{filename}"

    doc = ClinicalDoc(
        case_id=case_id,
        user_id=user_id,
        title=filename,
        doc_type=os.path.splitext(filename)[1].lstrip("."),
        location=rel_path,
    )
    session.add(doc)
    await session.commit()
    return {"saved": filename, "url": rel_path}

async def delete_clinical_documents(case_id: str, urls: list[str], session):
    if not urls:                                              # nothing to do
        return await list_clinical_documents(case_id, session)

    # fetch rows
    rows = (
        await session.scalars(
            select(ClinicalDoc)
            .where(ClinicalDoc.case_id == case_id,
                   ClinicalDoc.location.in_(urls))
        )
    ).all()

    for row in rows:
        # remove file from disk (best‑effort)
        disk_path = os.path.join("storage", "clinical", *row.location.split("/")[2:])
        try:
            os.remove(disk_path)
        except FileNotFoundError:
            pass
        await session.delete(row)

    await session.commit()
    return await list_clinical_documents(case_id, session)
