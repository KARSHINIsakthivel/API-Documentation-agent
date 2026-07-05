import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from database.db import get_db_connection, init_db
from google import genai
from google.genai import types
from pypdf import PdfReader
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Absolute path calculations
base_dir = os.path.abspath(os.path.dirname(__file__))
template_dir = os.path.join(base_dir, "templates")
static_dir = os.path.join(base_dir, "static")

app = Flask(
    __name__,
    root_path=base_dir,
    template_folder=template_dir,
    static_folder=static_dir
)

# Startup Diagnostics for Templates and Static files
print("=" * 60)
print("FLASK PATH DIAGNOSTICS")
print(f"Base Directory: {base_dir}")
print(f"Template Directory (configured): {app.template_folder}")
print(f"Template Directory Exists: {os.path.exists(app.template_folder)}")
if os.path.exists(app.template_folder):
    print(f"Files in Template Directory: {os.listdir(app.template_folder)}")
print(f"Static Directory (configured): {app.static_folder}")
print(f"Static Directory Exists: {os.path.exists(app.static_folder)}")
print("=" * 60)

# Enable CORS so our React playground or external front-ends can easily test it
CORS(app)

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
ALLOWED_EXTENSIONS = {"txt", "md", "pdf"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max upload limit

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize database tables on server startup
init_db()

def allowed_file(filename):
    """Checks if the uploaded file has a supported extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_file(file_path, file_extension):
    """
    Extracts plain text content from TXT, Markdown, or PDF files.
    """
    if file_extension in ["txt", "md"]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    elif file_extension == "pdf":
        try:
            reader = PdfReader(file_path)
            extracted_text = ""
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
            return extracted_text.strip()
        except Exception as e:
            print(f"Error reading PDF: {e}")
            return ""
    return ""

# --- HTML TEMPLATE ROUTE ---
@app.route("/")
def index():
    """Renders the main beginner-friendly dashboard."""
    return render_template("index.html")


# --- API ENDPOINTS ---

@app.route("/api/documents", methods=["GET"])
def get_documents():
    """Retrieves all uploaded documents metadata from SQLite."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, type, uploaded_at FROM documents ORDER BY id DESC")
        documents = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify({"success": True, "documents": documents})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/documents/upload", methods=["POST"])
def upload_document():
    """
    Handles document file uploads.
    Extracts the raw text content and stores metadata + content in SQLite.
    """
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file part in the request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "No file selected"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)

        file_extension = filename.rsplit(".", 1)[1].lower()
        extracted_content = extract_text_from_file(file_path, file_extension)

        if not extracted_content.strip():
            # Clean up empty/unreadable file
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({"success": False, "error": "The file is empty or text could not be extracted."}), 400

        try:
            # Save document data into SQLite
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO documents (name, type, content) VALUES (?, ?, ?)",
                (filename, file_extension, extracted_content)
            )
            conn.commit()
            doc_id = cursor.lastrowid
            conn.close()

            return jsonify({
                "success": True,
                "document": {
                    "id": doc_id,
                    "name": filename,
                    "type": file_extension
                }
            })
        except Exception as e:
            return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    
    return jsonify({"success": False, "error": "Allowed file types are: PDF, TXT, MD"}), 400


@app.route("/api/documents/<int:doc_id>", methods=["DELETE"])
def delete_document(doc_id):
    """Deletes a document from SQLite by ID."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if exists
        cursor.execute("SELECT name FROM documents WHERE id = ?", (doc_id,))
        doc = cursor.fetchone()
        if not doc:
            conn.close()
            return jsonify({"success": False, "error": "Document not found"}), 404

        # Delete from database
        cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        conn.commit()
        conn.close()

        # Try to delete the local file if it exists in uploads folder
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], doc["name"])
        if os.path.exists(file_path):
            os.remove(file_path)

        return jsonify({"success": True, "message": "Document deleted successfully."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/chats", methods=["GET"])
def get_chats():
    """Retrieves full chat message history from SQLite."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, role, content, timestamp FROM chats ORDER BY id ASC")
        chats = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify({"success": True, "chats": chats})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/chats/message", methods=["POST"])
def send_message():
    """
    Handles queries.
    1. Saves the user's message in SQLite.
    2. Gathers text from all uploaded documents for context.
    3. Calls Google Gemini API with the document context & system prompt.
    4. Saves the Gemini AI response in SQLite and returns history.
    """
    data = request.get_json() or {}
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"success": False, "error": "Message is required."}), 400

    # 1. Save user message to database
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO chats (role, content) VALUES ('user', ?)", (message,))
        conn.commit()
        conn.close()
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to save query to DB: {str(e)}"}), 500

    # 2. Extract documentation text for model context
    context_text = ""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name, content FROM documents")
        rows = cursor.fetchall()
        conn.close()
        
        if rows:
            context_parts = []
            for row in rows:
                context_parts.append(f"=== DOCUMENT: {row['name']} ===\n{row['content']}")
            context_text = "\n\n".join(context_parts)
    except Exception as e:
        print(f"Error querying documents for context: {e}")

    # If no files are in SQLite, remind the user to load something
    if not context_text.strip():
        context_text = "NO DOCUMENTATION UPLOADED YET."

    # 3. Request Answer from Google Gemini API
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        error_response = "⚠️ GEMINI_API_KEY is missing. Please add it to your local .env configuration file."
        # Save error message as assistant response in DB
        save_assistant_msg(error_response)
        return get_updated_chats()

    try:
        # Initialize Google GenAI client
        client = genai.Client(api_key=api_key)

        system_prompt = (
            "You are an API Documentation Assistant. Answer questions only from the uploaded documentation. "
            "If the answer is not available, reply: 'The uploaded documentation doesn't contain enough information.' "
            "Never make up API endpoints or information."
        )

        prompt_body = f"""
Below is the content of the uploaded API documentation context:
---
{context_text}
---

User's Question: {message}

Instructions: Analyze the context. Answer the user's question accurately using ONLY information found in the documents above. If the information is not present, reply exactly: 'The uploaded documentation doesn't contain enough information.'
"""

        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt_body,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.2, # Low temperature ensures strict factual accuracy
            )
        )

        ai_answer = response.text if response.text else "The uploaded documentation doesn't contain enough information."

    except Exception as e:
        print(f"Gemini API Error: {e}")
        ai_answer = f"⚠️ Gemini API Communication error: {str(e)}"

    # 4. Save AI Response in SQLite
    save_assistant_msg(ai_answer)
    return get_updated_chats()


@app.route("/api/chats/clear", methods=["POST"])
def clear_chats():
    """Clears all chat logs from SQLite."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM chats")
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Chat history cleared successfully."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


def save_assistant_msg(content):
    """Helper utility to write assistant responses to SQLite."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO chats (role, content) VALUES ('assistant', ?)", (content,))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error saving assistant msg: {e}")


def get_updated_chats():
    """Helper to retrieve and return current conversation history."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, role, content, timestamp FROM chats ORDER BY id ASC")
        chats = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify({"success": True, "chats": chats})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    # Run the web server on port 5000
    app.run(host="0.0.0.0", port=5000, debug=True)