# RealityLens — Production REST API Documentation (v1.0.0)

All endpoints are versioned under `/api/v1`. Authentication uses standard Bearer JWT tokens via `Authorization: Bearer <token>`.

---

## 1. Authentication (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Creates a new tenant user and provisions their default workspace.

- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "full_name": "Kiran Kumar",
    "preferred_language": "kn",
    "ai_personality": "student"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "c1f7b8d4-...",
      "email": "user@example.com",
      "full_name": "Kiran Kumar",
      "preferred_language": "kn",
      "ai_personality": "student"
    }
  }
  ```

### `POST /api/v1/auth/login`
- **Request Body:** `{"email": "...", "password": "..."}`
- **Response (200 OK):** JWT token and user profile.

---

## 2. Lens & Scans (`/api/v1/lens`)

### `POST /api/v1/lens/scans`
Uploads a captured camera frame or image, runs edge-variance blur detection, persists metadata, and triggers multimodal reasoning.

- **Form Parameters:**
  - `file`: Binary image file (JPEG / PNG / WebP)
  - `prompt`: User's text or voice question (e.g., "What are the exam deadlines?")
  - `mode`: `general` | `lockin` | `campus` | `receipt` | `code` | `translate` | `science`
  - `language`: `en` | `kn` | `hi`
- **Response (201 Created):**
  ```json
  {
    "id": "scan_8109...",
    "user_id": "usr_9120...",
    "image_url": "/uploads/scan_8109....jpg",
    "thumbnail_url": "/uploads/scan_8109..._thumb.jpg",
    "blur_score": 128.45,
    "is_blurry": false,
    "width": 1920,
    "height": 1080,
    "mode": "campus",
    "language": "kn",
    "is_saved_to_brain": false,
    "vision_result": {
      "observed_facts": ["VTU Circular No. 42", "Date: 25/11/2026"],
      "inferred_facts": ["Final semester viva examination scheduled."],
      "response_markdown": "### VTU ಪರೀಕ್ಷಾ ಅಧಿಸೂಚನೆ...",
      "suggested_actions": [
        {"label": "Add to Calendar", "action": "CREATE_CALENDAR_EVENT", "payload": {}}
      ],
      "warnings": [],
      "provider_used": "gemini-2.0-flash"
    }
  }
  ```

---

## 3. Visual Chat (`/api/v1/chat`)

### `POST /api/v1/chat/conversations/{id}/messages`
Follow-up multi-turn conversation maintaining image context.

- **Request Body:**
  ```json
  {
    "content": "Explain this in Kannada",
    "language": "kn"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "id": "msg_9012...",
    "sender": "assistant",
    "content": "ಈ ಸರ್ಕ್ಯೂಟ್‌ನಲ್ಲಿರುವ ರೆಸಿಸ್ಟರ್ ವಿದ್ಯುತ್ ಪ್ರವಾಹವನ್ನು ನಿಯಂತ್ರಿಸುತ್ತದೆ...",
    "epistemic_class": "INFERRED",
    "sources": [{"type": "chat_multimodal", "provider": "gemini-2.0-flash"}]
  }
  ```

---

## 4. Personal Brain (`/api/v1/brain`)

### `POST /api/v1/brain/search`
Strictly isolated tenant RAG search.

- **Request Body:**
  ```json
  {
    "query": "scholarship circular",
    "category": "college",
    "limit": 10
  }
  ```

---

## 5. Reality Agent & Tools (`/api/v1/agent`)

### `POST /api/v1/agent/tools/execute`
Pre-validates tool intent against typed Pydantic models. Flags `requires_confirmation = true`.

### `POST /api/v1/agent/tools/confirm`
- **Request Body:**
  ```json
  {
    "task_id": "tsk_2910...",
    "approved": true
  }
  ```
- **Response (200 OK):** Executes action (creates calendar entry, expense record, or task) and writes to audit log.
