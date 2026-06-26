# Clan War Tracker - PRD

## Original Problem Statement
Clash Royale klan savaşı takip web uygulaması (Türkçe). Klan yönetimi (klasörlere ayır, ekle/sil), klan savaşı takibi (5dk otomatik + manuel sync), oyuncu katılım katmanları (Tamamlayan ✅, Yarım 🟡, Yapmayan ❌), istatistikler (madalyon, kullanılan deste 4/4), günlük geçmiş + tarih filtresi, oyuncu adına tıklayınca RoyaleAPI profili.

## User Choices
- Auth: Tek kullanıcı, kullanıcı adı **TK** / şifre **2903** (backend .env)
- Otomatik sync: Backend APScheduler (5dk)
- API: Royal API Proxy (`https://proxy.royaleapi.dev/v1`)
- Klasör sistemi: Klanlar karışmasın diye gruplama
- Dil: Türkçe

## Architecture
- **Backend**: FastAPI + MongoDB (Motor) + APScheduler + httpx
  - JWT auth (Bearer header) with 7-day expiry
  - Endpoints under `/api/auth`, `/api/folders`, `/api/clans`, `/api/sync`
  - 5-minute background scheduler hits Royale Proxy and snapshots per (clan_id, snapshot_date)
- **Frontend**: React 19 + react-router + Tailwind + shadcn/ui + sonner
  - Token in localStorage `cw_token`, axios interceptor injects `Authorization`
  - Dark "tactical command center" aesthetic (Outfit + IBM Plex Sans + JetBrains Mono)

## Implemented (2026-02)
- ✅ Login page with single-user JWT auth
- ✅ Sidebar with folder grouping, add/delete folder, add/delete clan
- ✅ Overview dashboard (clan count, active wars, prep, clan cards)
- ✅ Clan detail page: stats row + player table with status badges (Tam/Yarım/Yok)
- ✅ Player rows link to `https://royaleapi.com/player/<tag>` (new tab)
- ✅ History page with clan selector + date picker (shadcn Calendar)
- ✅ Manual sync (per clan + global) + auto-sync (5 min via APScheduler)
- ✅ 404 / notInWar handled gracefully (no hard failure in auto-sync)
- ✅ Tested: backend 13/13 pytest, frontend Playwright e2e all pass

## Backlog (P1)
- Player-level history graph (madalyon trend) per oyuncu over multiple days
- Per-period (preparation vs warDay) separate snapshots for granular history
- CSV export of war day report
- Notification when a war day ends with incomplete attackers

## P2
- Multi-user with roles (admin / viewer per klan)
- Mobile-first layout polish
- Webhook for Discord summaries

## Test Credentials
See `/app/memory/test_credentials.md`
