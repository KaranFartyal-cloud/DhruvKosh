import httpx
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def test_auth():
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)
    
    # 1. Test Health
    health = client.get("/health").json()
    print("[SUCCESS] Health Check:", health.get("status"))

    # 2. Test Seed Admin Login
    admin_login = client.post("/auth/login", json={"email": "admin@ncpor.gov.in", "password": "admin123"})
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[SUCCESS] Seed Admin Login successful:", admin_login.json()["user"]["email"])

    # 3. Register New Researcher with 9 fields
    new_researcher_data = {
        "name": "Dr. Vikram Sarabhai",
        "email": "vikram.sarabhai@isro.gov.in",
        "password": "spacepass123",
        "confirm_password": "spacepass123",
        "institution": "Indian Space Research Organisation (ISRO)",
        "designation": "Director & Principal Investigator",
        "research_area": "Satellite Remote Sensing of Polar Ice Sheets",
        "researcher_id": "ISRO-RES-007",
        "phone_number": "+91 9988776655"
    }
    
    reg_res = client.post("/auth/register-researcher", json=new_researcher_data)
    if reg_res.status_code == 400 and "already registered" in reg_res.text:
        print("[INFO] Researcher already registered from previous run. Logging in...")
    else:
        assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
        res_user = reg_res.json()
        assert res_user["is_approved"] is False
        print("[SUCCESS] Researcher Registration successful. Approval status:", res_user["is_approved"])

    # 4. Login as Newly Registered Researcher (Pending Approval)
    res_login = client.post("/auth/login", json={"email": "vikram.sarabhai@isro.gov.in", "password": "spacepass123"})
    assert res_login.status_code == 200
    res_token = res_login.json()["access_token"]
    res_headers = {"Authorization": f"Bearer {res_token}"}
    print("[SUCCESS] Researcher Login successful. User role:", res_login.json()["user"]["role"])

    # Ensure status is reset to Pending (is_approved = False) for test consistency
    client.post(f"/auth/researchers/{res_login.json()['user']['id']}/reject", headers=admin_headers)

    # 5. Verify Pending Researcher cannot publish social media posts
    publish_attempt = client.post("/publish/1", json={"platforms": ["twitter"]}, headers=res_headers)
    assert publish_attempt.status_code == 403, f"Expected 403 Forbidden for pending researcher, got: {publish_attempt.status_code}"
    print("[SUCCESS] Enforcement Verified: Pending researcher blocked from posting across social media platforms (403 Forbidden).")

    # 6. Admin lists all researchers and approves Dr. Vikram Sarabhai
    researchers_list = client.get("/auth/researchers", headers=admin_headers).json()
    target_researcher = next(r for r in researchers_list if r["email"] == "vikram.sarabhai@isro.gov.in")
    print(f"[SUCCESS] Admin fetched {len(researchers_list)} researchers. Target ID: {target_researcher['id']}")

    approve_res = client.post(f"/auth/researchers/{target_researcher['id']}/approve", headers=admin_headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["is_approved"] is True
    print("[SUCCESS] Admin Approval successful! Researcher is_approved is now True.")

    # 7. Verify Approved Researcher is no longer blocked with 403 Forbidden
    publish_approved = client.post("/publish/1", json={"platforms": ["twitter"]}, headers=res_headers)
    assert publish_approved.status_code != 403, f"Publishing blocked with 403 even after approval: {publish_approved.text}"
    print("[SUCCESS] Post-Approval Verification: Approved Researcher passed permission check (Status != 403)!")

    # 8. Test Google Sign-In for Normal User
    google_res = client.post("/auth/google-login", json={
        "email": "student.explorer@university.edu",
        "name": "Student Explorer",
        "avatar_url": "https://lh3.googleusercontent.com/a/default-avatar=s96-c"
    })
    assert google_res.status_code == 200
    google_user = google_res.json()["user"]
    assert google_user["role"] == "user"
    print("[SUCCESS] Normal User Google Sign-In successful. User role:", google_user["role"])

    print("\n=======================================================")
    print(" ALL ROLE-BASED AUTHENTICATION TESTS PASSED PERFECTLY!")
    print("=======================================================")

if __name__ == "__main__":
    test_auth()
