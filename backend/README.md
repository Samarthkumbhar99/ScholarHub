# ScholarHub — Backend (FastAPI)

Welcome to the backend service for **ScholarHub**, built with FastAPI.

---

## 1. Prerequisites

- **Python**: Version 3.11+ (Python 3.13 tested and verified)
- **Pip**: Latest version

---

## 2. Virtual Environment Setup

From the `backend/` directory, create a dedicated Python virtual environment:

### Windows (PowerShell / Command Prompt)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Linux / macOS
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

---

## 3. Dependency Installation

With your virtual environment activated, install the minimal foundation dependencies:

```bash
pip install -r requirements.txt
```

---

## 4. Environment File Setup

Copy the sample environment file to `.env`:

### Windows
```powershell
copy .env.example .env
```

### Linux / macOS
```bash
cp .env.example .env
```

The default values in `.env.example` are preconfigured for local development:
```env
APP_NAME=ScholarHub API
ENVIRONMENT=development
DEBUG=true
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=["http://localhost:8081","http://localhost:19006","http://localhost:3000","http://127.0.0.1:8081","http://127.0.0.1:3000"]
```

---

## 5. How to Run the FastAPI Server

Start the local development server with live reload:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The server will be available at:
- **Base URL**: `http://localhost:8000`
- **Root endpoint**: `http://localhost:8000/`

---

## 6. Health Endpoint

Check backend readiness and health:

- **Method**: `GET`
- **URL**: `http://localhost:8000/api/v1/health`
- **Sample Response**:
  ```json
  {
    "status": "healthy",
    "service": "ScholarHub API",
    "version": "1.0.0"
  }
  ```

---

## 7. Interactive API Documentation (Swagger & ReDoc)

FastAPI automatically generates interactive documentation:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI JSON Schema**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## 8. Running Tests

Run the test suite using pytest:

```bash
pytest
```

To run with verbose output:
```bash
pytest -v
```
