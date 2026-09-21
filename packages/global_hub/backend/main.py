"""
Standalone Entrypoint for Global Hub Marketplace & Clearinghouse Backend.
Runs independently on Port 8000.
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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


@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "GLOBAL_HUB_CLEARINGHOUSE",
        "version": "2.0.0",
        "port": 8000
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
