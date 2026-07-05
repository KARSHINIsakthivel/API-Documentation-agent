# 📄 API Documentation Agent

An AI-powered web application that automatically generates professional API documentation from source code or API endpoint definitions using a Large Language Model (LLM).

This project helps developers save time by creating clear, structured, and easy-to-read API documentation.

---

## 🚀 Features

- Upload source code files or API definitions
- Automatically extract API endpoints
- Generate API documentation using an LLM
- View generated documentation in the browser
- Store uploaded files and generated documentation in SQLite
- Clean and beginner-friendly interface
- Download generated documentation

---
Project Link:

https://api-documentation-agent-137224473505.asia-southeast1.run.app\

## 🛠️ Tech Stack

### Frontend
- HTML
- CSS
- Bootstrap
- JavaScript

### Backend
- Python
- Flask

### AI
- Google Gemini API (or Groq API)

### Database
- SQLite

---

## 📂 Project Structure

```
api-documentation-agent/
│
├── app.py
├── requirements.txt
├── database.db
├── README.md
│
├── uploads/
│
├── generated_docs/
│
├── templates/
│   ├── index.html
│   └── result.html
│
├── static/
│   ├── style.css
│   └── script.js
│
└── utils.py
```

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/api-documentation-agent.git

cd api-documentation-agent
```

### 2. Create a virtual environment

Windows

```bash
python -m venv venv

venv\Scripts\activate
```

Linux / Mac

```bash
python3 -m venv venv

source venv/bin/activate
```

---

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

---

### 4. Configure API Key

Create a `.env` file.

```text
GEMINI_API_KEY=YOUR_API_KEY
```

---

### 5. Run the application

```bash
python app.py
```

Visit

```
http://127.0.0.1:5000
```

---

## 📖 How It Works

1. Open the web application.
2. Upload a Python file or API source code.
3. Click **Generate Documentation**.
4. The application sends the code to the LLM.
5. The AI analyzes the endpoints.
6. Documentation is generated automatically.
7. View or download the generated documentation.

---

## 📌 Example Output

### Endpoint

```
GET /users
```

### Description

Returns a list of all users.

### Parameters

| Name | Type | Required |
|------|------|----------|
| page | Integer | No |

### Response

```json
[
  {
    "id":1,
    "name":"John"
  }
]
```

---

## 💾 Database

SQLite stores:

- Uploaded file information
- Generated documentation
- Generation timestamp

---

## 📸 Screenshots

### Home Page

```
Upload API File
```

---

### Generated Documentation

```
Endpoint
Description
Parameters
Request
Response
```

(Add screenshots after completing the project.)

---

## 📋 Requirements

- Python 3.10+
- Flask
- Google Generative AI SDK
- SQLite
- Bootstrap

---

## 📦 requirements.txt

```
Flask
google-generativeai
python-dotenv
markdown
```

---

## 🔮 Future Enhancements

- Swagger/OpenAPI export
- PDF documentation generation
- DOCX export
- Authentication
- Support multiple programming languages
- Search generated documentation
- Documentation history
- Dark mode
- Docker support

---

## 🎯 Learning Outcomes

Through this project you will learn:

- Flask Web Development
- Prompt Engineering
- REST APIs
- Google Gemini API Integration
- File Upload Handling
- SQLite Database
- AI-powered Automation
- Documentation Generation

---

## 👨‍💻 Author

**Karshini Sakthivel**



---

