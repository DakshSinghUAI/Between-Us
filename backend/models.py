from typing import Optional
from sqlmodel import SQLModel, Field


class Memory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    content: str
    date: str
    type: str = "Moment"
    embedding: Optional[str] = None
    photos: Optional[str] = None