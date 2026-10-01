import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from packages.global_hub.backend.api import router as global_hub_router

app = FastAPI(
    title="Global Hub Marketplace & Clearinghouse API",
    description="Multi-city marketplace booking, autonomous AI sourcing, Stripe Connect 80/10/10 split settlements, and ChatGPT/MCP AI tools",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(global_hub_router)


@app.on_event("startup")
def on_startup():
    """Initializes authoritative database schema and registers all certified affiliate vendors with geo-coordinates on startup."""
    try:
        from packages.shared.database import SessionLocal, Base, engine
        from packages.global_hub.backend.services.hub_repository import HubRepository
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            repo = HubRepository(db)
            repo.ensure_default_vetted_vendors()
        finally:
            db.close()
    except Exception as e:
        import logging
        logging.getLogger("GlobalHub").error(f"Startup initialization notice: {e}")


@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "GLOBAL_HUB_CLEARINGHOUSE",
        "version": "2.0.0",
        "port": 8000
    }


# Static Frontend Distribution Support (Docker & Production Build)
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa_frontend(full_path: str):
        if full_path.startswith("api") or full_path.startswith("health"):
            return None
        candidate = os.path.join(frontend_dist, full_path)
        if os.path.exists(candidate) and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(frontend_dist, "index.html"))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

