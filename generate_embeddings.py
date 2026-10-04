import json

from sqlmodel import Session, select

from backend.database import engine
from backend.models import Memory
from backend.embeddings import create_embedding


with Session(engine) as session:
    memories = session.exec(select(Memory)).all()

    for memory in memories:
        if memory.embedding:
            print(f"Skipping: {memory.title}")
            continue

        memory_text = f"""
Title: {memory.title}
Type: {memory.type}
Date: {memory.date}
Memory: {memory.content}
"""

        print(f"Creating embedding: {memory.title}")

        embedding = create_embedding(memory_text)
        memory.embedding = json.dumps(embedding)

        session.add(memory)

    session.commit()

print("All existing memories now have embeddings.")