"""
Authoritative REST API Client for Global Hub <-> Sovereign Vendor Cell Communications.
Enforces strict decouple-by-API architecture across all Monorepo packages.
"""

from __future__ import annotations

import logging
from typing import Dict, Any, Optional
import requests

logger = logging.getLogger("VendorCellApiClient")


class VendorCellApiClient:
    """Client for invoking Sovereign Vendor Cell REST APIs over HTTP."""

    def __init__(self, timeout_seconds: float = 5.0):
        self.timeout_seconds = timeout_seconds
        self.session = requests.Session()

    def get_vendor_health(self, base_url: str) -> Optional[Dict[str, Any]]:
        """Checks if a vendor cell is online and healthy."""
        try:
            url = f"{base_url.rstrip('/')}/health"
            res = self.session.get(url, timeout=self.timeout_seconds)
            if res.status_code == 200:
                return res.json()
        except Exception as e:
            logger.debug(f"Health check failed for {base_url}: {e}")
        return None

    def request_vendor_quote(self, base_url: str, quote_payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Queries a Sovereign Vendor Cell's live pricing engine endpoint over REST.
        POST /api/quotes/calculate or POST /api/v1/quotes/calculate
        """
        for endpoint in ["/api/quotes/calculate", "/api/v1/quotes/calculate", "/api/demo/quotes"]:
            try:
                url = f"{base_url.rstrip('/')}{endpoint}"
                res = self.session.post(url, json=quote_payload, timeout=self.timeout_seconds)
                if res.status_code == 200:
                    return res.json()
            except Exception as e:
                logger.debug(f"Quote request to {url} failed: {e}")
        return None

    def dispatch_booking_intake(self, base_url: str, booking_payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Farms out a confirmed booking to the Sovereign Vendor Cell over REST.
        POST /api/bookings/intake or POST /api/v1/bookings/intake
        """
        for endpoint in ["/api/bookings/intake", "/api/v1/bookings/intake", "/api/bookings"]:
            try:
                url = f"{base_url.rstrip('/')}{endpoint}"
                res = self.session.post(url, json=booking_payload, timeout=self.timeout_seconds)
                if res.status_code in [200, 201]:
                    return res.json()
            except Exception as e:
                logger.debug(f"Booking dispatch to {url} failed: {e}")
        return None


# Global singleton instance
vendor_cell_api_client = VendorCellApiClient()
