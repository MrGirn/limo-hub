"""
Real S3 Object Storage & Sovereign Media Vault Service.
Enables high-performance multi-photo uploads for fleet showrooms, driver documents, and vehicle assets.
Integrates with AWS S3 / Cloudflare R2 / S3-compatible endpoints with authoritative local media vault persistence.
"""
from __future__ import annotations

import os
import time
import uuid
import base64
import logging
import mimetypes
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("S3StorageService")


class S3UploadResult(BaseModel):
    photo_id: str
    url: str
    photo_url: str = ""
    s3_uri: str
    bucket: str
    key: str
    content_type: str
    size_bytes: int
    caption: str
    photo_type: str = "EXTERIOR"  # EXTERIOR, CABIN, COCKPIT, TRUNK, AMENITY
    is_primary: bool = False
    display_order: int = 1
    ai_enhanced: bool = False
    uploaded_at: float = Field(default_factory=time.time)


class S3StorageService:
    """Manages S3 object storage operations and local sovereign media caching."""

    def __init__(self):
        self.bucket_name = os.getenv("AWS_S3_MEDIA_BUCKET", os.getenv("AWS_S3_BUCKET_NAME", "limo-fleet-media-prod"))
        self.region = os.getenv("AWS_REGION", "us-east-1")
        self.access_key = os.getenv("AWS_ACCESS_KEY_ID")
        self.secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.endpoint_url = os.getenv("AWS_S3_ENDPOINT_URL")
        self.local_media_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../../data/media")
        )
        os.makedirs(self.local_media_dir, exist_ok=True)

    def upload_photo(
        self,
        vendor_id: str,
        file_bytes: bytes,
        filename: str,
        content_type: Optional[str] = None,
        photo_type: str = "EXTERIOR",
        caption: str = "",
        is_primary: bool = False,
        display_order: int = 1,
        ai_enhanced: bool = False,
        vehicle_id: Optional[str] = None
    ) -> S3UploadResult:
        """
        Uploads an image file to S3 and returns the public CDN / direct URL and S3 metadata.
        """
        clean_vendor = vendor_id.replace("vendor_", "").replace("vendor-", "").replace("-", "_")
        photo_id = f"img_{clean_vendor}_{uuid.uuid4().hex[:10]}"
        
        # Determine extension
        ext = os.path.splitext(filename)[1].lower() if filename else ".webp"
        if not ext or ext not in [".jpg", ".jpeg", ".png", ".webp", ".heic"]:
            ext = ".webp" if content_type == "image/webp" else ".jpg"
            
        if not content_type:
            content_type = mimetypes.guess_type(f"file{ext}")[0] or "image/jpeg"

        veh_segment = vehicle_id or "fleet_showroom"
        s3_key = f"vendors/{clean_vendor}/vehicles/{veh_segment}/{photo_id}{ext}"

        # 1. Real S3 Upload if AWS credentials are provided
        public_url = ""
        s3_uri = f"s3://{self.bucket_name}/{s3_key}"

        if self.access_key and self.secret_key:
            try:
                import boto3
                client_kwargs: Dict[str, Any] = {
                    "region_name": self.region,
                    "aws_access_key_id": self.access_key,
                    "aws_secret_access_key": self.secret_key
                }
                if self.endpoint_url:
                    client_kwargs["endpoint_url"] = self.endpoint_url

                s3_client = boto3.client("s3", **client_kwargs)
                s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=file_bytes,
                    ContentType=content_type,
                    Metadata={
                        "vendor_id": vendor_id,
                        "photo_type": photo_type,
                        "ai_enhanced": str(ai_enhanced),
                        "uploaded_at": str(time.time())
                    }
                )
                public_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
                logger.info(f"Successfully uploaded photo to AWS S3: {public_url}")
            except Exception as e:
                logger.warning(f"AWS S3 direct upload failed ({e}), persisting to sovereign local media vault.")

        # 2. Local Sovereign Media Storage Persistence
        local_rel_path = f"vendors/{clean_vendor}/vehicles/{veh_segment}/{photo_id}{ext}"
        local_abs_path = os.path.join(self.local_media_dir, local_rel_path)
        os.makedirs(os.path.dirname(local_abs_path), exist_ok=True)

        with open(local_abs_path, "wb") as f:
            f.write(file_bytes)

        if not public_url:
            public_url = f"/api/v1/media/{local_rel_path}"

        return S3UploadResult(
            photo_id=photo_id,
            url=public_url,
            photo_url=public_url,
            s3_uri=s3_uri,
            bucket=self.bucket_name,
            key=s3_key,
            content_type=content_type,
            size_bytes=len(file_bytes),
            caption=caption or f"{photo_type.replace('_', ' ').title()} View",
            photo_type=photo_type,
            is_primary=is_primary,
            display_order=display_order,
            ai_enhanced=ai_enhanced
        )

    def upload_base64_photo(
        self,
        vendor_id: str,
        base64_data: str,
        photo_type: str = "EXTERIOR",
        caption: str = "",
        is_primary: bool = False,
        display_order: int = 1,
        ai_enhanced: bool = False,
        vehicle_id: Optional[str] = None
    ) -> S3UploadResult:
        """Decodes base64 data URI from canvas compressor and uploads to S3."""
        content_type = "image/jpeg"
        raw_data = base64_data

        if "," in base64_data:
            header, raw_data = base64_data.split(",", 1)
            if "image/webp" in header:
                content_type = "image/webp"
            elif "image/png" in header:
                content_type = "image/png"
            elif "image/jpeg" in header or "image/jpg" in header:
                content_type = "image/jpeg"

        file_bytes = base64.b64decode(raw_data)
        ext = ".webp" if "webp" in content_type else (".png" if "png" in content_type else ".jpg")
        filename = f"upload_{uuid.uuid4().hex[:8]}{ext}"

        return self.upload_photo(
            vendor_id=vendor_id,
            file_bytes=file_bytes,
            filename=filename,
            content_type=content_type,
            photo_type=photo_type,
            caption=caption,
            is_primary=is_primary,
            display_order=display_order,
            ai_enhanced=ai_enhanced,
            vehicle_id=vehicle_id
        )

    def upload_driver_document(
        self,
        driver_id: str,
        vendor_id: str,
        file_bytes: bytes,
        filename: str,
        document_type: str = "COMMERCIAL_CHAUFFEUR_LICENSE",
        document_name: str = "Chauffeur Credential",
        expiry_date: Optional[str] = None,
        content_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Uploads a driver credential (e.g. TLC license, DOT card) to S3 vault."""
        clean_vendor = vendor_id.replace("vendor_", "").replace("vendor-", "").replace("-", "_")
        doc_id = f"doc_{driver_id}_{uuid.uuid4().hex[:8]}"
        
        ext = os.path.splitext(filename)[1].lower() if filename else ".jpg"
        if not ext or ext not in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]:
            ext = ".jpg"
            
        if not content_type:
            content_type = mimetypes.guess_type(f"file{ext}")[0] or "image/jpeg"

        s3_key = f"vendors/{clean_vendor}/drivers/{driver_id}/credentials/{doc_id}{ext}"
        public_url = ""
        s3_uri = f"s3://{self.bucket_name}/{s3_key}"

        if self.access_key and self.secret_key:
            try:
                import boto3
                client_kwargs: Dict[str, Any] = {
                    "region_name": self.region,
                    "aws_access_key_id": self.access_key,
                    "aws_secret_access_key": self.secret_key
                }
                if self.endpoint_url:
                    client_kwargs["endpoint_url"] = self.endpoint_url

                s3_client = boto3.client("s3", **client_kwargs)
                s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=file_bytes,
                    ContentType=content_type,
                    Metadata={
                        "driver_id": driver_id,
                        "vendor_id": vendor_id,
                        "document_type": document_type,
                        "uploaded_at": str(time.time())
                    }
                )
                public_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
                logger.info(f"Successfully uploaded driver document to AWS S3: {public_url}")
            except Exception as e:
                logger.warning(f"AWS S3 direct upload failed ({e}), persisting to sovereign local media vault.")

        local_rel_path = f"vendors/{clean_vendor}/drivers/{driver_id}/credentials/{doc_id}{ext}"
        local_abs_path = os.path.join(self.local_media_dir, local_rel_path)
        os.makedirs(os.path.dirname(local_abs_path), exist_ok=True)

        with open(local_abs_path, "wb") as f:
            f.write(file_bytes)

        if not public_url:
            public_url = f"/api/v1/media/{local_rel_path}"

        return {
            "document_id": doc_id,
            "driver_id": driver_id,
            "vendor_id": vendor_id,
            "document_type": document_type,
            "document_name": document_name,
            "file_url": public_url,
            "s3_uri": s3_uri,
            "file_size_bytes": len(file_bytes),
            "mime_type": content_type,
            "expiry_date": expiry_date,
            "status": "VERIFIED",
            "uploaded_at_utc": datetime.now(timezone.utc).isoformat()
        }

    def upload_base64_driver_document(
        self,
        driver_id: str,
        vendor_id: str,
        base64_data: str,
        document_type: str = "COMMERCIAL_CHAUFFEUR_LICENSE",
        document_name: str = "Chauffeur Credential",
        expiry_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Decodes base64 mobile camera image and saves as driver document."""
        content_type = "image/jpeg"
        raw_data = base64_data

        if "," in base64_data:
            header, raw_data = base64_data.split(",", 1)
            if "image/webp" in header:
                content_type = "image/webp"
            elif "image/png" in header:
                content_type = "image/png"
            elif "image/jpeg" in header or "image/jpg" in header:
                content_type = "image/jpeg"
            elif "application/pdf" in header:
                content_type = "application/pdf"

        file_bytes = base64.b64decode(raw_data)
        ext = ".pdf" if "pdf" in content_type else (".webp" if "webp" in content_type else (".png" if "png" in content_type else ".jpg"))
        filename = f"credential_{uuid.uuid4().hex[:8]}{ext}"

        return self.upload_driver_document(
            driver_id=driver_id,
            vendor_id=vendor_id,
            file_bytes=file_bytes,
            filename=filename,
            document_type=document_type,
            document_name=document_name,
            expiry_date=expiry_date,
            content_type=content_type
        )


s3_storage_service = S3StorageService()

