"""Backend API tests for Clan War Tracker"""
import os
import pytest
import requests
import uuid as _uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://clash-war-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

USERNAME = "TK"
PASSWORD = "2903"
TEST_CLAN_TAG = "#2PP"  # known to work in current riverrace


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"username": USERNAME, "password": PASSWORD}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data["username"] == USERNAME
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# --- Auth ---
class TestAuth:
    def test_login_wrong(self):
        r = requests.post(f"{API}/auth/login", json={"username": "x", "password": "y"}, timeout=20)
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 401

    def test_me_with_token(self, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        assert r.json()["username"] == USERNAME

    def test_protected_endpoints_unauth(self):
        for ep in ["/folders", "/clans", "/sync/status"]:
            r = requests.get(f"{API}{ep}", timeout=20)
            assert r.status_code == 401, f"{ep} should require auth"


# --- Folders ---
class TestFolders:
    def test_list_has_default(self, auth_headers):
        r = requests.get(f"{API}/folders", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        folders = r.json()
        assert any(f.get("name") == "Genel" and f.get("is_default") for f in folders), folders

    def test_create_and_delete(self, auth_headers):
        name = f"TEST_F_{_uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/folders", json={"name": name}, headers=auth_headers, timeout=20)
        assert r.status_code == 200
        f = r.json()
        assert f["name"] == name
        fid = f["id"]
        # verify via list
        rl = requests.get(f"{API}/folders", headers=auth_headers, timeout=20)
        assert any(x["id"] == fid for x in rl.json())
        # delete
        rd = requests.delete(f"{API}/folders/{fid}", headers=auth_headers, timeout=20)
        assert rd.status_code == 200
        # verify gone
        rl2 = requests.get(f"{API}/folders", headers=auth_headers, timeout=20)
        assert not any(x["id"] == fid for x in rl2.json())

    def test_cannot_delete_default(self, auth_headers):
        r = requests.get(f"{API}/folders", headers=auth_headers, timeout=20)
        default = next(f for f in r.json() if f.get("is_default"))
        rd = requests.delete(f"{API}/folders/{default['id']}", headers=auth_headers, timeout=20)
        assert rd.status_code == 400

    def test_empty_name_rejected(self, auth_headers):
        r = requests.post(f"{API}/folders", json={"name": "  "}, headers=auth_headers, timeout=20)
        assert r.status_code == 400


# --- Clans ---
class TestClans:
    def test_list_clans(self, auth_headers):
        r = requests.get(f"{API}/clans", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_clan_lifecycle(self, auth_headers):
        # cleanup if exists
        rl = requests.get(f"{API}/clans", headers=auth_headers, timeout=20).json()
        for c in rl:
            if c.get("tag") == TEST_CLAN_TAG:
                requests.delete(f"{API}/clans/{c['id']}", headers=auth_headers, timeout=30)
        # add
        r = requests.post(f"{API}/clans", json={"tag": TEST_CLAN_TAG}, headers=auth_headers, timeout=60)
        if r.status_code != 200:
            pytest.skip(f"Royale API issue or clan not found: {r.status_code} {r.text[:200]}")
        clan = r.json()
        assert clan["tag"] == TEST_CLAN_TAG
        assert clan.get("name")
        cid = clan["id"]

        # current
        rc = requests.get(f"{API}/clans/{cid}/current", headers=auth_headers, timeout=30)
        assert rc.status_code == 200
        body = rc.json()
        assert body["clan"]["id"] == cid

        # manual sync
        rs = requests.post(f"{API}/clans/{cid}/sync", headers=auth_headers, timeout=60)
        assert rs.status_code == 200
        snap = rs.json()
        assert "participants" in snap
        assert "full_count" in snap and "partial_count" in snap and "none_count" in snap

        # history
        rh = requests.get(f"{API}/clans/{cid}/history", headers=auth_headers, timeout=30)
        assert rh.status_code == 200
        h = rh.json()
        assert isinstance(h["snapshots"], list)
        assert len(h["snapshots"]) >= 1

        # history date filter
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        rh2 = requests.get(f"{API}/clans/{cid}/history?date={today}", headers=auth_headers, timeout=30)
        assert rh2.status_code == 200
        assert all(s["snapshot_date"] == today for s in rh2.json()["snapshots"])

        # duplicate add
        rd = requests.post(f"{API}/clans", json={"tag": TEST_CLAN_TAG}, headers=auth_headers, timeout=30)
        assert rd.status_code == 400

        # delete clan
        rdel = requests.delete(f"{API}/clans/{cid}", headers=auth_headers, timeout=20)
        assert rdel.status_code == 200
        # confirm history removed
        rh3 = requests.get(f"{API}/clans/{cid}/history", headers=auth_headers, timeout=20)
        assert rh3.status_code == 404

    def test_invalid_clan_tag(self, auth_headers):
        r = requests.post(f"{API}/clans", json={"tag": "#ZZZZZZZZZZ"}, headers=auth_headers, timeout=30)
        assert r.status_code == 400


# --- Sync ---
class TestSync:
    def test_sync_status(self, auth_headers):
        r = requests.get(f"{API}/sync/status", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "last_run" in d or d == {}

    def test_sync_all(self, auth_headers):
        r = requests.post(f"{API}/sync/all", headers=auth_headers, timeout=120)
        assert r.status_code == 200
        d = r.json()
        assert "last_run" in d
        assert "success" in d
