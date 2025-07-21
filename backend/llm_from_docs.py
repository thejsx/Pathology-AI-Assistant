import openai
from dotenv import load_dotenv
import os
import aiofiles
from pathlib import Path
from sqlalchemy import select
from db.models import ClinicalDoc
import docx  # pip install python-docx

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
client = openai.AsyncOpenAI()


async def main(case_id, user_id, selected, specimen, session):
    docs = await list_clinical_documents(case_id, session)
    messages = await create_messages(selected, specimen, docs)
    response = await query_llm(messages)
    print(f"LLM token usage: {response.usage}")
    return response.choices[0].message.content


async def list_clinical_documents(case_id: str, session) -> list:
    rows = await session.scalars(select(ClinicalDoc).where(ClinicalDoc.case_id == case_id))
    docs = []

    base_path = Path("storage/clinical")
    for row in rows:
        file_path = base_path / row.location.replace("/clinical/", "")
        if file_path.exists():
            docs.append(
                {
                    "title": row.title,
                    "path": str(file_path),
                    "doc_type": row.doc_type,
                }
            )
        else:
            print(f"Warning: File not found at {file_path}")

    return docs


async def extract_text_async(path: str) -> str:
    ext = Path(path).suffix.lower()
    if ext == ".txt":
        async with aiofiles.open(path, "r", encoding="utf-8", errors="ignore") as f:
            return await f.read()
    if ext == ".docx":
        return "\n".join(p.text for p in docx.Document(path).paragraphs)
    # simple fallback for .doc or unsupported: skip
    return ""


async def create_messages(selected_docs, specimen, docs):
    prompt = (
        f"Please take the attached clinical documents and generate thorough summaries for the following fields: {', '.join(selected_docs)} that are relevant to a pathology specimen: {specimen['summary']} collected on: {specimen['date']}. The output should be structured as a JSON object with the fields as keys and the values as strings (no recursive structure). Each field value should contain relevant information for the pathologist based on the provided documents. Include dates if they are provided, and sort information closer to the collection date as more relevant. The actual 'summary' field, if selected, should have an overall summary of the clinical history and all the other fields. Do not include HIPAA identifiable information (PHI) in the output."
    )

    messages = [{"role": "system", "content": "You are a medical summarizer."}]
    content = [{"type": "text", "text": prompt}]

    for doc in docs:
        ext = doc["doc_type"].lower()
        path = doc["path"]

        if ext in ["jpg", "jpeg", "png", "gif", "webp"]:
            file_ref = await client.files.create(file=open(path, "rb"), purpose="vision")
            content.append({"type": "file", "file": {"file_id": file_ref.id}})
        elif ext == "pdf":
            file_ref = await client.files.create(file=open(path, "rb"), purpose="user_data")
            content.append({"type": "file", "file": {"file_id": file_ref.id}})
        elif ext in ["docx", "doc", "txt"]:
            text = await extract_text_async(path)
            if text:
                content.append(
                    {
                        "type": "text",
                        "text": f"Document: {doc['title']} (Type: {doc['doc_type']})\n{text}",
                    }
                )
        else:
            print(f"Skipping unsupported type: {ext}")

    messages.append({"role": "user", "content": content})
    return messages


async def query_llm(messages):
    response = await client.chat.completions.create(model="gpt-4.1-mini", messages=messages)
    print(f"LLM response: {response.choices[0].message.content}")
    return response
