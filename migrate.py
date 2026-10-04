import sqlite3

conn = sqlite3.connect("data/memories.db")

conn.execute(
    "ALTER TABLE memory ADD COLUMN type TEXT DEFAULT 'Moment'"
)

conn.commit()
conn.close()

print("Migration complete")