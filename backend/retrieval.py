import json
import math
import ollama

EMBEDDING_MODEL = "nomic-embed-text"


def create_query_embedding(question: str):
    response = ollama.embed(
        model=EMBEDDING_MODEL,
        input=question
    )

    return response["embeddings"][0]


def cosine_similarity(a, b):
    dot_product = sum(x * y for x, y in zip(a, b))

    magnitude_a = math.sqrt(sum(x * x for x in a))
    magnitude_b = math.sqrt(sum(y * y for y in b))

    if magnitude_a == 0 or magnitude_b == 0:
        return 0

    return dot_product / (magnitude_a * magnitude_b)


def retrieve_memories(question, memories, top_k=3):

    query_embedding = create_query_embedding(question)

    scored_memories = []

    question_lower = question.lower()

    for memory in memories:

        if not memory.embedding:
            continue

        memory_embedding = json.loads(memory.embedding)

        score = cosine_similarity(
            query_embedding,
            memory_embedding
        )

        # Give a small boost when important words
        # from the question appear in the memory.

        memory_text = (
            f"{memory.title} "
            f"{memory.content} "
            f"{memory.type}"
        ).lower()

        keyword_bonus = 0

        question_words = question_lower.split()

        for word in question_words:

            word = word.strip("?!.,'\"")

            if len(word) > 3 and word in memory_text:
                keyword_bonus += 0.05

        final_score = score + keyword_bonus

        scored_memories.append(
            (final_score, memory)
        )

    scored_memories.sort(
        key=lambda x: x[0],
        reverse=True
    )

    return [
        memory
        for score, memory in scored_memories[:top_k]
    ]