from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select

from pathlib import Path
import uuid

import os
import json
import whisper

from backend.ai import ask_ai, extract_memory_from_transcript
from backend.database import create_db_and_tables, engine
from backend.models import Memory
from backend.embeddings import create_embedding
from backend.retrieval import retrieve_memories


app = FastAPI()

os.makedirs("uploads/memories", exist_ok=True)
os.makedirs("uploads/photos", exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)

# Load Whisper
whisper_model = whisper.load_model("base")


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5178",
        "http://127.0.0.1:5178",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create database tables when the server starts
@app.on_event("startup")
def on_startup():
    create_db_and_tables()


# Home
@app.get("/")
def home():
    return {
        "message": "Welcome to Between Us ❤️"
    }


# Ask AI about memories
@app.get("/ask")
def ask(question: str):
    with Session(engine) as session:
        memories = session.exec(
            select(Memory)
        ).all()

    relevant_memories = retrieve_memories(
        question,
        memories,
        top_k=3
    )

    answer = ask_ai(
        question,
        relevant_memories
    )

    return {
        "question": question,
        "answer": answer
    }


# Add a memory
@app.post("/memories")
def add_memory(memory: Memory):

    memory_text = f"""
Title: {memory.title}
Type: {memory.type}
Date: {memory.date}
Memory: {memory.content}
"""

    embedding = create_embedding(
        memory_text
    )

    memory.embedding = json.dumps(
        embedding
    )

    with Session(engine) as session:
        session.add(memory)
        session.commit()
        session.refresh(memory)

    return memory


# Get all memories
@app.get("/memories")
def get_memories():

    with Session(engine) as session:
        memories = session.exec(
            select(Memory)
        ).all()

    return memories


# Voice Memory
@app.post("/voice-memory")
async def voice_memory(file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)

    file_path = os.path.join("uploads", file.filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    result = whisper_model.transcribe(file_path)
    transcript = result["text"].strip()

    extracted_memory = extract_memory_from_transcript(transcript)

    return {
        "filename": file.filename,
        "transcript": transcript,
        "memory": extracted_memory
    }


# 👇 ADD THE NEW CODE HERE
@app.post("/memories/{memory_id}/photos")
async def upload_memory_photos(
    memory_id: int,
    files: list[UploadFile] = File(...)
):
    if len(files) > 3:
        raise HTTPException(
            status_code=400,
            detail="You can upload a maximum of 3 photos."
        )

    with Session(engine) as session:
        memory = session.get(Memory, memory_id)

        if not memory:
            raise HTTPException(
                status_code=404,
                detail="Memory not found."
            )

        existing_photos = []

        if memory.photos:
            existing_photos = json.loads(memory.photos)

        if len(existing_photos) + len(files) > 3:
            raise HTTPException(
                status_code=400,
                detail="A memory can have a maximum of 3 photos."
            )

        new_photos = []

        for file in files:
            if not file.content_type or not file.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=400,
                    detail="Only image files are allowed."
                )

            extension = Path(file.filename or "").suffix.lower()

            filename = f"{uuid.uuid4().hex}{extension}"

            file_path = Path("uploads/memories") / filename

            with open(file_path, "wb") as buffer:
                buffer.write(await file.read())

            photo_url = f"/uploads/memories/{filename}"

            new_photos.append(photo_url)

        memory.photos = json.dumps(
            existing_photos + new_photos
        )

        session.add(memory)
        session.commit()
        session.refresh(memory)

        return memory

@app.post("/photos")
async def upload_standalone_photos(
    files: list[UploadFile] = File(...)
):
    if len(files) > 10:
        raise HTTPException(
            status_code=400,
            detail="You can upload a maximum of 10 photos at once."
        )

    uploaded_photos = []

    for file in files:

        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail="Only image files are allowed."
            )

        extension = Path(file.filename or "").suffix.lower()

        filename = f"{uuid.uuid4().hex}{extension}"

        file_path = Path("uploads/photos") / filename

        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())

        photo_url = f"/uploads/photos/{filename}"

        uploaded_photos.append(photo_url)

    return {
        "photos": uploaded_photos
    }

@app.delete("/photos")
async def delete_photo(photo_url: str):
    if not photo_url.startswith("/uploads/photos/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid photo."
        )

    filename = Path(photo_url).name
    file_path = Path("uploads/photos") / filename

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Photo not found."
        )

    file_path.unlink()

    return {
        "message": "Photo deleted successfully."
    }