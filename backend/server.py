from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import asyncio
import jwt
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("clanwar")

# ---------- Mongo ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ---------- Auth ----------
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
AUTH_USERNAME = os.environ["AUTH_USERNAME"]
AUTH_PASSWORD = os.environ["AUTH_PASSWORD"]
TOKEN_EXPIRE_HOURS = 24 * 7

security = HTTPBearer(auto_error=False)


def create_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def require_auth(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    if creds is None:
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Oturum süresi doldu")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")


# ---------- Models ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


class LoginRequest(BaseModel):
    username: str
    password: str


class FolderCreate(BaseModel):
    name: str


class Folder(BaseModel):
    id: str
    name: str
    created_at: str


class ClanCreate(BaseModel):
    tag: str
    folder_id: Optional[str] = None


class Clan(BaseModel):
    id: str
    tag: str
    name: str
    folder_id: Optional[str] = None
    badge_id: Optional[int] = None
    last_synced: Optional[str] = None
    war_state: Optional[str] = None
    created_at: str


# ---------- Royale API ----------
ROYALE_BASE = os.environ["ROYALE_API_BASE"]
ROYALE_TOKEN = os.environ["ROYALE_API_TOKEN"]


def normalize_tag(tag: str) -> str:
    t = tag.strip().upper().replace("O", "0")
    if not t.startswith("#"):
        t = "#" + t
    return t


def tag_for_url(tag: str) -> str:
    # URL-encode # as %23
    return tag.replace("#", "%23")


async def royale_get(path: str) -> Dict[str, Any]:
    url = f"{ROYALE_BASE}{path}"
    headers = {"Authorization": f"Bearer {ROYALE_TOKEN}", "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=20.0) as hc:
        resp = await hc.get(url, headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Royale API hatası: {resp.text[:200]}")
    return resp.json()


async def fetch_player_current_clan(player_tag: str) -> Dict[str, Any]:
    """Return {'ok': bool, 'clan_tag': Optional[str]}. ok=False means lookup failed."""
    try:
        data = await royale_get(f"/players/{tag_for_url(player_tag)}")
    except Exception as e:
        logger.warning(f"Player lookup failed for {player_tag}: {e}")
        return {"ok": False, "clan_tag": None}
    clan = data.get("clan") or {}
    return {"ok": True, "clan_tag": clan.get("tag")}


async def enrich_participants_with_clan_status(participants: List[Dict[str, Any]], war_clan_tag: str) -> None:
    """Mutates participants in-place to add current_clan_tag and left_clan flag."""
    sem = asyncio.Semaphore(6)

    async def one(p):
        if not p.get("tag"):
            p["current_clan_tag"] = None
            p["left_clan"] = False
            p["clan_check_ok"] = False
            return
        async with sem:
            res = await fetch_player_current_clan(p["tag"])
        p["clan_check_ok"] = res["ok"]
        p["current_clan_tag"] = res["clan_tag"]
        # Only mark left when we actually got a definitive answer.
        if res["ok"]:
            p["left_clan"] = (res["clan_tag"] != war_clan_tag)
        else:
            p["left_clan"] = False

    await asyncio.gather(*(one(p) for p in participants))


def classify_player(decks_used_today: int) -> str:
    if decks_used_today >= 4:
        return "full"
    if decks_used_today >= 1:
        return "partial"
    return "none"


def build_participants(raw_clan: Dict[str, Any]) -> List[Dict[str, Any]]:
    participants = []
    for p in raw_clan.get("participants", []) or []:
        decks_today = int(p.get("decksUsedToday", 0) or 0)
        decks_total = int(p.get("decksUsed", 0) or 0)
        participants.append({
            "tag": p.get("tag"),
            "name": p.get("name"),
            "fame": int(p.get("fame", 0) or 0),
            "repair_points": int(p.get("repairPoints", 0) or 0),
            "boat_attacks": int(p.get("boatAttacks", 0) or 0),
            "decks_used": decks_total,
            "decks_used_today": decks_today,
            "status": classify_player(decks_today),
        })
    return participants


async def sync_clan_data(clan_doc: Dict[str, Any]) -> Dict[str, Any]:
    tag = clan_doc["tag"]
    try:
        data = await royale_get(f"/clans/{tag_for_url(tag)}/currentriverrace")
    except HTTPException as e:
        # 404 from currentriverrace usually means clan is not in a river race right now.
        # Treat as notInWar (soft state) instead of a hard failure so auto-sync stays clean.
        if e.status_code == 404:
            logger.info(f"Clan {tag} not in current river race (404 -> notInWar)")
            data = {"state": "notInWar", "clan": {}, "periodIndex": None, "periodType": None, "sectionIndex": None}
        else:
            logger.error(f"Sync failed for {tag}: {e.detail}")
            await db.clans.update_one({"id": clan_doc["id"]}, {"$set": {"last_sync_error": str(e.detail), "last_sync_attempt": now_iso()}})
            raise

    clan_section = data.get("clan", {}) or {}
    participants = build_participants(clan_section)
    war_state = data.get("state", "notInWar")
    period_index = data.get("periodIndex")
    period_type = data.get("periodType")
    section_index = data.get("sectionIndex")

    # Enrich participants with their current clan tag (so we can mark "ayrılan" players).
    if participants:
        await enrich_participants_with_clan_status(participants, tag)

    total_fame = sum(p["fame"] for p in participants)
    total_decks = sum(p["decks_used"] for p in participants)
    full_count = sum(1 for p in participants if p["status"] == "full")
    partial_count = sum(1 for p in participants if p["status"] == "partial")
    none_count = sum(1 for p in participants if p["status"] == "none")
    left_count = sum(1 for p in participants if p.get("left_clan"))

    snapshot_date = today_str()
    snapshot = {
        "clan_id": clan_doc["id"],
        "clan_tag": tag,
        "clan_name": clan_section.get("name") or clan_doc.get("name"),
        "snapshot_date": snapshot_date,
        "war_state": war_state,
        "period_index": period_index,
        "period_type": period_type,
        "section_index": section_index,
        "participants": participants,
        "total_fame": total_fame,
        "total_decks_used": total_decks,
        "full_count": full_count,
        "partial_count": partial_count,
        "none_count": none_count,
        "left_count": left_count,
        "saved_at": now_iso(),
    }

    # Upsert one snapshot per (clan_id, snapshot_date)
    await db.war_snapshots.update_one(
        {"clan_id": clan_doc["id"], "snapshot_date": snapshot_date},
        {"$set": snapshot},
        upsert=True,
    )

    # Update clan
    update_data = {
        "name": clan_section.get("name") or clan_doc.get("name"),
        "badge_id": clan_section.get("badgeId"),
        "last_synced": now_iso(),
        "war_state": war_state,
        "last_sync_error": None,
        "current_period_index": period_index,
        "current_period_type": period_type,
    }
    await db.clans.update_one({"id": clan_doc["id"]}, {"$set": update_data})
    return snapshot


# ---------- Scheduler ----------
scheduler = AsyncIOScheduler(timezone="UTC")


async def sync_all_job():
    logger.info("Auto-sync job started")
    clans = await db.clans.find({}, {"_id": 0}).to_list(1000)
    success, failed = 0, 0
    for c in clans:
        try:
            await sync_clan_data(c)
            success += 1
        except Exception as e:
            logger.warning(f"Auto-sync failed for {c.get('tag')}: {e}")
            failed += 1
    await db.sync_state.update_one(
        {"_id": "global"},
        {"$set": {"last_run": now_iso(), "success": success, "failed": failed}},
        upsert=True,
    )
    logger.info(f"Auto-sync complete: ok={success} fail={failed}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure default folder
    default = await db.folders.find_one({"is_default": True})
    if not default:
        await db.folders.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Genel",
            "is_default": True,
            "created_at": now_iso(),
        })
    interval = int(os.environ.get("SYNC_INTERVAL_MINUTES", "5"))
    scheduler.add_job(sync_all_job, "interval", minutes=interval, id="sync_all", next_run_time=datetime.now(timezone.utc) + timedelta(seconds=20))
    scheduler.start()
    logger.info(f"Scheduler started, interval={interval}m")
    yield
    scheduler.shutdown(wait=False)
    client.close()


app = FastAPI(lifespan=lifespan)
api = APIRouter(prefix="/api")


# ---------- Routes ----------
@api.get("/")
async def root():
    return {"app": "clan-war-tracker", "status": "ok"}


@api.post("/auth/login")
async def login(body: LoginRequest):
    if body.username != AUTH_USERNAME or body.password != AUTH_PASSWORD:
        raise HTTPException(status_code=401, detail="Kullanıcı adı veya şifre hatalı")
    token = create_token(body.username)
    return {"token": token, "username": body.username}


@api.get("/auth/me")
async def me(user: str = Depends(require_auth)):
    return {"username": user}


# Folders
@api.get("/folders")
async def list_folders(user: str = Depends(require_auth)):
    folders = await db.folders.find({}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return folders


@api.post("/folders")
async def create_folder(body: FolderCreate, user: str = Depends(require_auth)):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Klasör adı boş olamaz")
    folder = {"id": str(uuid.uuid4()), "name": name, "created_at": now_iso(), "is_default": False}
    await db.folders.insert_one(folder)
    folder.pop("_id", None)
    return folder


@api.delete("/folders/{folder_id}")
async def delete_folder(folder_id: str, user: str = Depends(require_auth)):
    folder = await db.folders.find_one({"id": folder_id})
    if not folder:
        raise HTTPException(status_code=404, detail="Klasör bulunamadı")
    if folder.get("is_default"):
        raise HTTPException(status_code=400, detail="Varsayılan klasör silinemez")
    # Move clans to no folder
    await db.clans.update_many({"folder_id": folder_id}, {"$set": {"folder_id": None}})
    await db.folders.delete_one({"id": folder_id})
    return {"ok": True}


# Clans
@api.get("/clans")
async def list_clans(user: str = Depends(require_auth)):
    clans = await db.clans.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return clans


@api.post("/clans")
async def add_clan(body: ClanCreate, user: str = Depends(require_auth)):
    tag = normalize_tag(body.tag)
    existing = await db.clans.find_one({"tag": tag})
    if existing:
        raise HTTPException(status_code=400, detail="Bu klan zaten ekli")

    # Fetch clan info
    try:
        info = await royale_get(f"/clans/{tag_for_url(tag)}")
    except HTTPException as e:
        raise HTTPException(status_code=400, detail=f"Klan bulunamadı: {e.detail}")

    clan = {
        "id": str(uuid.uuid4()),
        "tag": tag,
        "name": info.get("name", tag),
        "badge_id": info.get("badgeId"),
        "folder_id": body.folder_id,
        "last_synced": None,
        "war_state": None,
        "created_at": now_iso(),
    }
    await db.clans.insert_one(clan)
    clan.pop("_id", None)

    # Initial sync (don't block on errors)
    try:
        await sync_clan_data(clan)
    except Exception as e:
        logger.warning(f"Initial sync failed for {tag}: {e}")

    refreshed = await db.clans.find_one({"id": clan["id"]}, {"_id": 0})
    return refreshed


@api.delete("/clans/{clan_id}")
async def delete_clan(clan_id: str, user: str = Depends(require_auth)):
    clan = await db.clans.find_one({"id": clan_id})
    if not clan:
        raise HTTPException(status_code=404, detail="Klan bulunamadı")
    await db.clans.delete_one({"id": clan_id})
    await db.war_snapshots.delete_many({"clan_id": clan_id})
    return {"ok": True}


@api.patch("/clans/{clan_id}/folder")
async def move_clan_folder(clan_id: str, payload: Dict[str, Optional[str]], user: str = Depends(require_auth)):
    new_folder = payload.get("folder_id")
    result = await db.clans.update_one({"id": clan_id}, {"$set": {"folder_id": new_folder}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Klan bulunamadı")
    return {"ok": True}


@api.post("/clans/{clan_id}/sync")
async def manual_sync_clan(clan_id: str, user: str = Depends(require_auth)):
    clan = await db.clans.find_one({"id": clan_id}, {"_id": 0})
    if not clan:
        raise HTTPException(status_code=404, detail="Klan bulunamadı")
    snap = await sync_clan_data(clan)
    return snap


@api.get("/clans/{clan_id}/current")
async def get_current_war(clan_id: str, user: str = Depends(require_auth)):
    clan = await db.clans.find_one({"id": clan_id}, {"_id": 0})
    if not clan:
        raise HTTPException(status_code=404, detail="Klan bulunamadı")
    snap = await db.war_snapshots.find_one(
        {"clan_id": clan_id, "snapshot_date": today_str()}, {"_id": 0}
    )
    if not snap:
        # latest available
        snap = await db.war_snapshots.find_one({"clan_id": clan_id}, {"_id": 0}, sort=[("saved_at", -1)])
    return {"clan": clan, "snapshot": snap}


@api.get("/clans/{clan_id}/history")
async def get_history(clan_id: str, date: Optional[str] = None, user: str = Depends(require_auth)):
    clan = await db.clans.find_one({"id": clan_id}, {"_id": 0})
    if not clan:
        raise HTTPException(status_code=404, detail="Klan bulunamadı")
    query: Dict[str, Any] = {"clan_id": clan_id}
    if date:
        query["snapshot_date"] = date
    snaps = await db.war_snapshots.find(query, {"_id": 0}).sort("snapshot_date", -1).to_list(500)
    return {"clan": clan, "snapshots": snaps}


# Global sync
@api.post("/sync/all")
async def sync_all(user: str = Depends(require_auth)):
    await sync_all_job()
    state = await db.sync_state.find_one({"_id": "global"}, {"_id": 0})
    return state or {}


@api.get("/sync/status")
async def sync_status(user: str = Depends(require_auth)):
    state = await db.sync_state.find_one({"_id": "global"}, {"_id": 0})
    return state or {"last_run": None, "success": 0, "failed": 0}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
