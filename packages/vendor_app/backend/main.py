import os
import sys
import argparse
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from packages.vendor_app.backend.api import router as vendor_router

vendor_id = os.getenv("VENDOR_ID", "vendor_anb_philly")
vendor_name = os.getenv("VENDOR_NAME", "ANB Limo Executive Chauffeurs")
vendor_city = os.getenv("VENDOR_MARKET_CITY", "Philadelphia")
port = int(os.getenv("PORT", "8001"))

app = FastAPI(
    title=f"Sovereign Vendor Application API — {vendor_name}",
    description=f"Dedicated Sovereign Backend for {vendor_name} ({vendor_city})",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vendor_router)


@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "SOVEREIGN_VENDOR_CELL",
        "vendor_id": os.getenv("VENDOR_ID", "vendor_anb_philly"),
        "vendor_name": os.getenv("VENDOR_NAME", "ANB Limo Executive Chauffeurs"),
        "market_city": os.getenv("VENDOR_MARKET_CITY", "Philadelphia"),
        "version": "2.0.0",
        "port": int(os.getenv("PORT", str(port)))
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start a Sovereign Vendor Application Instance")
    parser.add_argument("--port", type=int, default=port, help="Port to run vendor backend on")
    parser.add_argument("--vendor-id", type=str, default=vendor_id, help="Unique identifier for the vendor")
    parser.add_argument("--vendor-name", type=str, default=vendor_name, help="Company display name")
    parser.add_argument("--city", type=str, default=vendor_city, help="Home market city")
    args = parser.parse_args()

    os.environ["PORT"] = str(args.port)
    os.environ["VENDOR_ID"] = args.vendor_id
    os.environ["VENDOR_NAME"] = args.vendor_name
    os.environ["VENDOR_MARKET_CITY"] = args.city

    print(f"\n=======================================================")
    print(f">> Starting Sovereign Vendor Instance: {args.vendor_name}")
    print(f"   Market: {args.city} | ID: {args.vendor_id}")
    print(f"   Backend Port: {args.port}")
    print(f"=======================================================\n")

    uvicorn.run("packages.vendor_app.backend.main:app", host="0.0.0.0", port=args.port, reload=False)

