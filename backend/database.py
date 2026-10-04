from sqlmodel import SQLModel, create_engine
from backend.models import Memory

DATABASE_URL = "sqlite:///data/memories.db"

engine = create_engine(
    DATABASE_URL,
    echo=True
)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)