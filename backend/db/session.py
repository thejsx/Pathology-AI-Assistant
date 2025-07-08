# backend/db/session.py
import os
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
import dotenv

dotenv.load_dotenv()

DB_URL = os.getenv("ASYNC_DATABASE_URL")

engine = create_async_engine(DB_URL, future=True)
AsyncSessionMaker = async_sessionmaker(engine, expire_on_commit=False)

async def get_session():
    async with AsyncSessionMaker() as session:
        yield session
