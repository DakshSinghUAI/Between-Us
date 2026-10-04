import ollama


EMBEDDING_MODEL = "nomic-embed-text"


def create_embedding(text: str):
    response = ollama.embed(
        model=EMBEDDING_MODEL,
        input=text
    )

    return response["embeddings"][0]