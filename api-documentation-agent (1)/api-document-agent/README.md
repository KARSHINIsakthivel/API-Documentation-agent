# API Documentation Agent

A beginner-friendly full-stack web application built with Python, Flask, SQLite, and Google Gemini AI. Users can upload API documentation files (PDF, TXT, or Markdown) and ask specific questions about them. The AI is strictly constrained to only answer based on the uploaded documents.

---

## Folder Structure

```text
api-document-agent/
│── app.py                 # The main Flask application server (Module 2)
│── templates/             # HTML templates for the front-end (Module 3)
│   └── index.html         # Main dashboard page
│── static/                # CSS styling and JavaScript logic (Module 3)
│   ├── style.css          # Visual layout styling
│   └── script.js          # Asynchronous upload & chat client
│── uploads/               # Directory to temporarily store uploaded documentation
│── database/              # SQLite database management
│   ├── db.py              # Schema setup and connection helper (Module 1)
│   └── database.db        # The generated SQLite database file
│── requirements.txt       # Python package dependencies (Module 1)
│── Dockerfile             # Containerized deployment blueprint (Module 9)
└── README.md              # Setup and running instructions (You are here!)
```

---

## How to Run This Project in VSCode

Follow these easy step-by-step instructions to run your project locally in **Visual Studio Code**.

### Step 1: Open the Project in VSCode
1. Download or export the project files to your computer.
2. Open **VSCode**.
3. Go to `File` > `Open Folder...` (or `Open...` on macOS) and select the folder you downloaded (e.g. `api-documentation-agent`).
4. **IMPORTANT:** Open your VSCode integrated terminal. If your terminal starts in the main parent directory, type the following command to move into the subfolder containing your code before doing anything else:
   ```bash
   cd api-document-agent
   ```

### Step 2: Set Up a Python Virtual Environment
It is best practice to run Python projects inside a virtual environment to keep your packages isolated.
1. Run the following command to create a virtual environment named `venv` inside the `api-document-agent` folder:
   - **Windows:**
     ```bash
     python -m venv venv
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv venv
     ```

### Step 3: Activate the Virtual Environment
Activate the environment so that any libraries you install stay inside this project.
- **Windows (Command Prompt):**
  ```cmd
  venv\Scripts\activate.bat
  ```
- **Windows (PowerShell):**
  ```powershell
  venv\Scripts\Activate.ps1
  ```
- **macOS / Linux:**
  ```bash
  source venv/bin/activate
  ```
*(You will see `(venv)` appear at the beginning of your terminal prompt once activated).*

### Step 4: Install Dependencies
Install all the required Python libraries listed in `requirements.txt`:
```bash
pip install -r requirements.txt
```

### Step 5: Configure Your Google Gemini API Key
This project requires a Gemini API key to interact with the AI model.
1. Create a file named `.env` in your root folder.
2. Add your API key inside it:
   ```env
   GEMINI_API_KEY="your_actual_api_key_here"
   ```
*(Note: Keep this key secret and never share it publicly!)*

### Step 6: Initialize the SQLite Database
Run the setup script to create the local database file and set up empty tables:
```bash
python database/db.py
```
This will generate a `database.db` file inside the `database/` folder.

### Step 7: Run the Flask Application
Now start the development web server:
```bash
python app.py
```
- The terminal will display a local address (usually `http://127.0.5.1:5000` or `http://localhost:5000`).
- **Control + Click** (or **Cmd + Click**) the link in your terminal to open the application in your browser!
