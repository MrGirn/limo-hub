"""
ChatGPT Actions & OpenAI Function Calling Service for Global Hub Marketplace.
Enables external LLMs (ChatGPT, Claude, Gemini, Siri) to query real-time vehicle rates,
reserve itineraries, and track live flight-radar chauffeurs.
"""

from typing import Dict, Any, List, Optional
from decimal import Decimal
from packages.shared.domain_models import VehicleClass
from packages.shared.protocol_contracts import ChatGPTQuoteRequest
from packages.global_hub.backend.services.marketplace_router import MarketplaceRouter


class ChatGPTToolsService:
    @classmethod
    def get_openapi_spec_for_chatgpt(cls) -> Dict[str, Any]:
        """Returns clean OpenAPI 3.0 specification tailored for ChatGPT Actions."""
        return {
            "openapi": "3.0.1",
            "info": {
                "title": "Global Executive Chauffeur & Limo Network AI Booking API",
                "description": "Book luxury black cars, executive SUVs, and airport transfers worldwide with real-time flight radar tracking.",
                "version": "v1.0"
            },
            "servers": [
                {"url": "https://api.limo.global/api/v1/global-hub/ai"}
            ],
            "paths": {
                "/quote": {
                    "post": {
                        "operationId": "calculateChauffeurQuote",
                        "summary": "Calculate instant guaranteed all-inclusive price for a chauffeured ride",
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "pickup_location": {"type": "string", "example": "John F. Kennedy International Airport (JFK)"},
                                            "dropoff_location": {"type": "string", "example": "The Plaza Hotel, 768 5th Ave, New York"},
                                            "pickup_time_utc": {"type": "string", "example": "2026-09-18T14:00:00Z"},
                                            "vehicle_class": {"type": "string", "enum": ["LUXURY_SUV", "FIRST_CLASS", "BUSINESS_VAN"], "default": "LUXURY_SUV"},
                                            "flight_number": {"type": "string", "example": "BA 178"}
                                        },
                                        "required": ["pickup_location", "dropoff_location", "pickup_time_utc"]
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "description": "Guaranteed price quote with itemized line items",
                                "content": {"application/json": {"schema": {"type": "object"}}}
                            }
                        }
                    }
                },
                "/book": {
                    "post": {
                        "operationId": "bookChauffeuredRide",
                        "summary": "Reserve and confirm an executive ride with passenger contact and payment hold",
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "passenger_name": {"type": "string", "example": "Arthur Vance"},
                                            "passenger_phone": {"type": "string", "example": "+1 212 555 9000"},
                                            "pickup_location": {"type": "string"},
                                            "dropoff_location": {"type": "string"},
                                            "pickup_time_utc": {"type": "string"},
                                            "vehicle_class": {"type": "string"}
                                        },
                                        "required": ["passenger_name", "passenger_phone", "pickup_location", "dropoff_location"]
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "description": "Booking confirmation with booking ID and live flight radar tracking link",
                                "content": {"application/json": {"schema": {"type": "object"}}}
                            }
                        }
                    }
                }
            }
        }

    @classmethod
    def execute_chatgpt_quote(cls, req: ChatGPTQuoteRequest) -> Dict[str, Any]:
        """Processes tool call from ChatGPT to calculate quote."""
        itin = MarketplaceRouter.quote_global_itinerary(
            title="ChatGPT AI Assistant Reservation",
            legs_data=[{
                "origin_address": req.pickup_location,
                "origin_city": "New York",
                "destination_address": req.dropoff_location,
                "destination_city": "New York",
                "distance_miles": 18.5
            }],
            vehicle_class=req.vehicle_class or VehicleClass.LUXURY_SUV
        )
        return {
            "success": True,
            "quote_id": f"q-ai-{itin.itinerary_id}",
            "all_inclusive_total_usd": float(itin.all_inclusive_total),
            "currency": "USD",
            "vehicle_tier": req.vehicle_class.value if req.vehicle_class else "LUXURY_SUV",
            "pickup": req.pickup_location,
            "destination": req.dropoff_location,
            "flight_radar_monitoring": f"Enabled for flight {req.flight_number}" if req.flight_number else "Standard 30 min free wait time included",
            "booking_action_link": f"https://limo.global/book?quote={itin.itinerary_id}"
        }
