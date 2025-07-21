# backend/db/models.py
from datetime import datetime, timezone
from sqlalchemy.orm import registry, Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, Boolean

mapper_registry = registry()
metadata = mapper_registry.metadata

# ────────────────────────  USERS  ────────────────────────────
@mapper_registry.mapped
class User():
    __tablename__ = "users"

    user_id:        Mapped[str]  = mapped_column(primary_key=True)

    settings:  Mapped[dict] = mapped_column(JSON, default=dict)

    # relationships
    cases:     Mapped[list["Case"]]       = relationship(back_populates="user")
    images:    Mapped[list["Image"]]      = relationship(back_populates="user")
    history:   Mapped[list["LLMHistory"]] = relationship(back_populates="user")
    clin_docs: Mapped[list["ClinicalDoc"]] = relationship(back_populates="user")


# ────────────────────────  CASES  ────────────────────────────
@mapper_registry.mapped
class Case():
    __tablename__ = "cases"

    case_id:  Mapped[str] = mapped_column(String, primary_key=True)
    created:  Mapped[datetime] = mapped_column(
                   DateTime(timezone=True),
                   default=lambda: datetime.now(timezone.utc)
               )
    updated:  Mapped[datetime] = mapped_column(
                   DateTime(timezone=True),
                   default=lambda: datetime.now(timezone.utc),
                   onupdate=lambda: datetime.now(timezone.utc)
               )

    user_id:  Mapped[str]      = mapped_column(ForeignKey("users.user_id"))

    user:     Mapped["User"]   = relationship(back_populates="cases")

    images:   Mapped[list["Image"]]      = relationship(
        back_populates="case",
        cascade="all, delete-orphan",
        passive_deletes=True)
    history:  Mapped[list["LLMHistory"]] = relationship(
        back_populates="case",
        cascade="all, delete-orphan",
        passive_deletes=True)
    clinical: Mapped["ClinicalData"]     = relationship(
        back_populates="case", 
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True)
    clin_docs: Mapped[list["ClinicalDoc"]] = relationship(
        back_populates="case",
        cascade="all, delete-orphan",
        passive_deletes=True
    )


# ────────────────────────  IMAGES  ───────────────────────────
@mapper_registry.mapped
class Image():
    __tablename__ = "images"

    id:        Mapped[int]      = mapped_column(primary_key=True)
    case_id:   Mapped[str]      = mapped_column(ForeignKey("cases.case_id", ondelete="CASCADE"), index=True)
    user_id:   Mapped[str]      = mapped_column(ForeignKey("users.user_id"))

    filename:  Mapped[str]      = mapped_column(String)
    rel_path:  Mapped[str]      = mapped_column(String)
    uploaded:  Mapped[datetime] = mapped_column(
                    DateTime(timezone=True),
                    default=lambda: datetime.now(timezone.utc)
                )

    case:      Mapped["Case"]   = relationship(back_populates="images")
    user:      Mapped["User"]   = relationship(back_populates="images")


# ───────────────────────  LLM HISTORY  ───────────────────────
@mapper_registry.mapped
class LLMHistory():
    __tablename__ = "llm_history"

    id:          Mapped[int]      = mapped_column(primary_key=True)
    case_id:     Mapped[str]      = mapped_column(ForeignKey("cases.case_id", ondelete="CASCADE"), index=True)
    user_id:     Mapped[str]      = mapped_column(ForeignKey("users.user_id"))

    start_ts:    Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                    default=lambda: datetime.now(timezone.utc))
    end_ts:      Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                    default=lambda: datetime.now(timezone.utc))
    prompt:      Mapped[str]
    image_count: Mapped[int]
    response:    Mapped[str]

    case:        Mapped["Case"]   = relationship(back_populates="history")
    user:        Mapped["User"]   = relationship(back_populates="history")


# ─────────────────────── CLINICAL DATA ───────────────────────
@mapper_registry.mapped
class ClinicalData():
    __tablename__ = "clinical_data"

    case_id:   Mapped[str]    = mapped_column(
                    ForeignKey("cases.case_id", ondelete="CASCADE"), primary_key=True)
    specimen:   Mapped[dict]  = mapped_column(JSON, default=lambda: {"summary":   "No specimen data", "details": {}, "date": ""})
    summary:   Mapped[str]    = mapped_column(String, default=
                    "No clinical data available.")
    procedure: Mapped[str]    = mapped_column(String, default=
                    "No procedure data available.")
    pathology: Mapped[str]    = mapped_column(String, default=
                    "No prior pathology data available.")
    imaging:   Mapped[str]    = mapped_column(String, default=
                    "No imaging data available.")
    labs:      Mapped[str]    = mapped_column(String, default=
                    "No lab data available.")

    case:      Mapped["Case"] = relationship(back_populates="clinical")

@mapper_registry.mapped
class ClinicalDoc():
    __tablename__ = "clinical_docs"

    id:       Mapped[int]  = mapped_column(primary_key=True)
    case_id:  Mapped[str]  = mapped_column(
                   ForeignKey("cases.case_id", ondelete="CASCADE"), index=True
               )
    user_id:  Mapped[str]  = mapped_column(ForeignKey("users.user_id"))
    title:    Mapped[str]  = mapped_column(String)
    doc_type: Mapped[str]  = mapped_column(String)   # "pdf", "docx", "text", …
    location: Mapped[str]  = mapped_column(String)   # local path or S3 URL
    uploaded: Mapped[datetime] = mapped_column(
                   DateTime(timezone=True),
                   default=lambda: datetime.now(timezone.utc)
               )
    user: Mapped["User"] = relationship(back_populates="clin_docs")
    case: Mapped["Case"] = relationship(back_populates="clin_docs")


