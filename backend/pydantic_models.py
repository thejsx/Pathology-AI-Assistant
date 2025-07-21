from pydantic import BaseModel
from typing import List, Optional

class ImagePayload(BaseModel):
    image: str
    case_id: str
    user_id: str

class DeleteImagesPayload(BaseModel):
    filenames: List[str]
    case_id: str

class GetImagesPayload(BaseModel):
    case_id: str
    user_id: Optional[str] = None
    
class QueryLLMPayload(BaseModel):
    user_id: str
    case_id: str
    image_ids: List[str]
    prompt: str
    effort: str
    max_tokens: int
    include_history: bool
    include_user: Optional[bool] = False
    clinical_data: Optional[dict | str] = None

class CancelLLMPayload(BaseModel):
    user_id: str
    case_id: str

class DeleteLLMHistoryPayload(BaseModel):
    case_id: str
    selected_history: List[int]
    user_id: Optional[str] = None

class AppendLLMHistoryPayload(BaseModel):
    case_id: str
    prompt: str
    image_count: int
    response: str

class User(BaseModel):
    user_id: Optional[str] = None

class GetLLMHistoryPayload(BaseModel):
    case_id: str
    user_id: Optional[str] = None

class AppendLLMHistoryPayload(BaseModel):
    case_id: str
    user_id: str
    prompt: str
    image_count: int
    response: str

class CaseId(BaseModel):
    case_id: str

class ClinicalFieldsUpdate(BaseModel):
    case_id: str
    fields: dict   # e.g. { "pathology": "…" }

class ClinicalDocUpload(BaseModel):
    case_id: str
    user_id: str
    filename: str
    file_data: str   # base64‑dataURL

class ClinicalDocsDelete(BaseModel):
    case_id: str
    urls:    list[str]     # e.g. “/clinical_docs/<case>/documents/<guid>_file.pdf”

class ClinicalDocsLLMQuery(BaseModel):
    case_id: str
    user_id: str
    specimen: dict
    selected: list[str]  

