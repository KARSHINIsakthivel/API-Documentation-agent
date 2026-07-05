import sqlite3
import os

# Define the absolute path for the SQLite database file
DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

def get_db_connection():
    """
    Establishes a connection to the SQLite database.
    Enables row factory so results can be accessed like dictionary keys.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initializes the SQLite database tables if they do not exist.
    Creates:
    1. 'documents' table to store uploaded files and their extracted contents.
    2. 'chats' table to keep track of previous conversational messages.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create documents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            content TEXT NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create chats table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()
    print("Database initialized successfully.")

if __name__ == "__main__":
    init_db()
