import ollama


def ask_ai(question, memories):

    memory_text = ""

    for memory in memories:
        memory_text += f"""
Title: {memory.title}
Type: {memory.type}
Date: {memory.date}
Memory: {memory.content}

"""

    prompt = f"""
You are the AI memory companion for a private application called
"Between Us".

The user is asking a question about their shared memories.

RETRIEVED MEMORIES:

{memory_text}

USER QUESTION:
"{question}"

IMPORTANT INSTRUCTIONS:

Answer the question ONLY using information explicitly present
in the retrieved memories.

Never invent information.

Never guess.

Never create missing details.

Pay very close attention to exactly what the user is asking.

For example:

If the memory says:
"We went on our first trip together."

and the user asks:
"What was our first trip?"

You may say:
"The memory records that you went on your first trip together."

But if the user asks:
"Where was our first trip?"

and the memory does not contain a location,
you MUST say:
"The location of your first trip wasn't recorded."

Similarly:

If the user asks "When was it?"
and no date is recorded,
say that no date was recorded.

If the user asks "Who was there?"
and the memory does not mention who was there,
say that the people involved were not recorded.

If the user asks about a detail that does not exist
in the retrieved memories, clearly say that the detail
was not recorded.

Do NOT answer a different question just because a related
memory exists.

The answer must directly address the user's exact question.

Be concise, warm, and natural.

Now answer the question.
"""

    response = ollama.chat(
        model="qwen2.5:7b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response["message"]["content"]


def extract_memory_from_transcript(transcript: str):
    prompt = f"""
You are the memory extraction AI for a private application called
"Between Us".

Convert the following voice transcript into a structured memory.

VOICE TRANSCRIPT:
"{transcript}"

Return ONLY valid JSON in exactly this format:

{{
    "title": "short meaningful title",
    "content": "clean memory content",
    "type": "Moment"
}}

Rules:
1. Do not invent facts.
2. Do not invent dates.
3. Do not invent names, places, events, or feelings.
4. Keep only information explicitly present in the transcript.
5. Keep the content natural and concise.
6. The type must be one of:
   - Moment
   - Trip
   - Date
   - Milestone
   - Other
7. If the transcript does not clearly indicate a type, use "Moment".
8. Do not include markdown.
9. Return JSON only.
"""

    response = ollama.chat(
        model="qwen2.5:7b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response["message"]["content"]