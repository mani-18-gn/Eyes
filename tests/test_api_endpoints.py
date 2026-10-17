import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from datetime import date

from backend.app.main import app
from backend.app.core.database import engine, Base
from tests.test_realitylens import create_sample_image

@pytest.mark.asyncio
async def test_full_auth_and_isolation_lifecycle():
    # Ensure tables are created for tests
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Health endpoint
        health_resp = await ac.get("/api/v1/settings/health")
        assert health_resp.status_code == 200
        assert health_resp.json()["status"] == "operational"

        # 2. Register User A
        uid = str(uuid.uuid4())[:8]
        user_a_email = f"usera_{uid}@realitylens.com"
        reg_a = await ac.post("/api/v1/auth/register", json={
            "email": user_a_email,
            "password": "Password123!",
            "full_name": "User Alpha",
            "preferred_language": "en",
            "ai_personality": "gen_z"
        })
        assert reg_a.status_code == 201
        token_a = reg_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 3. Register User B
        user_b_email = f"userb_{uid}@realitylens.com"
        reg_b = await ac.post("/api/v1/auth/register", json={
            "email": user_b_email,
            "password": "Password123!",
            "full_name": "User Beta",
            "preferred_language": "kn",
            "ai_personality": "student"
        })
        assert reg_b.status_code == 201
        token_b = reg_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 4. User A uploads a real scan
        img_bytes = create_sample_image(sharp=True)
        files = {"file": ("exam_notice.jpg", img_bytes, "image/jpeg")}
        data = {"prompt": "What are the exam deadlines?", "mode": "campus", "language": "en"}
        scan_resp = await ac.post("/api/v1/lens/scans", files=files, data=data, headers=headers_a)
        assert scan_resp.status_code == 201
        scan_data = scan_resp.json()
        scan_id_a = scan_data["id"]
        assert scan_data["mode"] == "campus"
        assert scan_data["vision_result"] is not None

        # 5. USER B ATTEMPTS TO ACCESS USER A'S SCAN (CRITICAL TEST 11: ISOLATION)
        forbidden_resp = await ac.get(f"/api/v1/lens/scans/{scan_id_a}", headers=headers_b)
        assert forbidden_resp.status_code == 404 # Isolated: Not found for User B!

        # 6. User A saves scan to Brain
        save_resp = await ac.post(f"/api/v1/lens/scans/{scan_id_a}/save-brain", headers=headers_a)
        assert save_resp.status_code == 200
        mem_id = save_resp.json()["id"]

        # 7. User B tries to search/access User A's Brain Memory
        search_b = await ac.post("/api/v1/brain/search", json={"query": "exam"}, headers=headers_b)
        assert search_b.status_code == 200
        assert len(search_b.json()) == 0 # User B gets zero results from User A's data!

        # 8. User A searches Brain and retrieves the saved scan
        search_a = await ac.post("/api/v1/brain/search", json={"query": "campus"}, headers=headers_a)
        assert search_a.status_code == 200
        assert len(search_a.json()) >= 1
        assert search_a.json()[0]["id"] == mem_id

        # 9. Reality Agent Tool Lifecycle with Explicit Confirmation
        tool_req = await ac.post("/api/v1/agent/tools/execute", json={
            "tool_name": "ADD_EXPENSE",
            "payload": {
                "merchant": "Campus Cafeteria",
                "amount": 250.0,
                "currency": "INR",
                "category": "Food",
                "date": str(date.today())
            }
        }, headers=headers_a)
        assert tool_req.status_code == 200
        task_data = tool_req.json()
        assert task_data["status"] == "PENDING_CONFIRMATION"
        task_id = task_data["id"]

        # User confirms execution
        confirm_resp = await ac.post("/api/v1/agent/tools/confirm", json={
            "task_id": task_id,
            "approved": True
        }, headers=headers_a)
        assert confirm_resp.status_code == 200
        assert confirm_resp.json()["status"] == "EXECUTED"

        # Verify expense appeared in expenses summary
        exp_summary = await ac.get("/api/v1/expenses/summary", headers=headers_a)
        assert exp_summary.status_code == 200
        assert exp_summary.json()["total_amount"] == 250.0
