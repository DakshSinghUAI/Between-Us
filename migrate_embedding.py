import sqlite3

conn = sqlite3.connect("data/memories.db")

conn.execute(
    "ALTER TABLE memory ADD COLUMN embedding TEXT"
)

conn.commit()
conn.close()

print("Embedding migration complete")