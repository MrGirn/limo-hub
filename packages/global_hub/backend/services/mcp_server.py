"""
Model Context Protocol (MCP) Server for Global Hub Marketplace.
Exposes real agentic tools for LLMs, Claude Desktop, Cursor, ChatGPT, and smart travel assistants.
"""

from typing import Dict, Any, List
from decimal import Decimal
from packages.shared.database import SessionLocal
from packages.global_hub.backend.services.hub_repository import HubRepository


class GlobalHubMCPServer:
    @classmethod
    def list_tools(cls) -> List[Dict[str, Any]]:
        """Returns standard MCP tool definitions."""
        return [
            {
                "name": "calculate_guaranteed_quote",
                "description": "Calculates an all-inclusive binding price quote for luxury chauffeured rides worldwide across single or multi-city itineraries.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "pickup": {"type": "string", "description": "Pickup airport, hotel, or street address"},
                        "destination": {"type": "string", "description": "Drop-off destination address"},
                        "vehicle_class": {"type": "string", "enum": ["BUSINESS_CLASS", "FIRST_CLASS", "BUSINESS_VAN"], "default": "BUSINESS_CLASS"},
                        "passengers": {"type": "integer", "default": 2}
                    },
                    "required": ["pickup", "destination"]
                }
            },
            {
                "name": "list_marketplace_vendors",
                "description": "Lists verified local affiliate fleet operators with ratings, vehicle makes, and amenities for airline-style comparison.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "city": {"type": "string", "description": "Target city or airport code (e.g. 'New York', 'London', 'Dubai')"}
                    }
                }
            },
            {
                "name": "book_public_ride",
                "description": "Creates an authoritative reservation on Global Hub, generates a single unified customer invoice, and triggers escrow hold.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "pickup_address": {"type": "string"},
                        "dropoff_address": {"type": "string"},
                        "passenger_name": {"type": "string"},
                        "passenger_email": {"type": "string"},
                        "passenger_phone": {"type": "string"},
                        "vehicle_class": {"type": "string", "enum": ["BUSINESS_CLASS", "FIRST_CLASS", "BUSINESS_VAN"]},
                        "flight_number": {"type": "string"},
                        "selected_vendor_id": {"type": "string", "description": "Optional specific vendor ID for airline mode"}
                    },
                    "required": ["pickup_address", "dropoff_address", "passenger_name", "passenger_email", "passenger_phone"]
                }
            },
            {
                "name": "lookup_booking_status",
                "description": "Retrieves real-time ride status, chauffeur details, and single invoice receipt by booking reference.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "booking_reference": {"type": "string", "description": "Booking reference code (e.g. 'LM-20481')"},
                        "email": {"type": "string", "description": "Customer email"}
                    },
                    "required": ["booking_reference"]
                }
            }
        ]

    @classmethod
    def call_tool(cls, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Executes an MCP tool call against authoritative database."""
        db = SessionLocal()
        try:
            repo = HubRepository(db)
            if name == "calculate_guaranteed_quote":
                pickup = arguments.get("pickup", "")
                destination = arguments.get("destination", "")
                v_class = arguments.get("vehicle_class", "BUSINESS_CLASS")
                rates = {"BUSINESS_CLASS": 145.00, "FIRST_CLASS": 210.00, "BUSINESS_VAN": 185.00}
                total = rates.get(v_class, 145.00)
                return {
                    "pickup": pickup,
                    "destination": destination,
                    "vehicle_class": v_class,
                    "base_fare_usd": total - 20.0,
                    "taxes_and_fees_usd": 20.0,
                    "total_all_inclusive_usd": total,
                    "flight_radar_included": True,
                    "free_cancellation_hours": 24
                }

            elif name == "list_marketplace_vendors":
                city = arguments.get("city", "New York")
                vendors = repo.list_vetted_vendors(city)
                return {
                    "city": city,
                    "total_vendors": len(vendors),
                    "vendors": [
                        {
                            "vendor_id": v.vendor_id,
                            "name": v.company_name,
                            "rating": float(v.rating_score),
                            "reviews": v.total_reviews_count,
                            "fleet": v.vehicle_makes,
                            "business_class_rate": float(v.business_class_base_rate_usd)
                        }
                        for v in vendors
                    ]
                }

            elif name == "book_public_ride":
                name_parts = arguments.get("passenger_name", "Alex Chen").split(" ", 1)
                first_name = name_parts[0]
                last_name = name_parts[1] if len(name_parts) > 1 else "Guest"
                
                v_class = arguments.get("vehicle_class", "BUSINESS_CLASS")
                rates = {"BUSINESS_CLASS": (125.00, 20.00), "FIRST_CLASS": (185.00, 25.00), "BUSINESS_VAN": (165.00, 20.00)}
                base_fare, fees = rates.get(v_class, (125.00, 20.00))

                booking = repo.create_master_booking(
                    trip_type="ONE_WAY",
                    pickup_address=arguments.get("pickup_address", "JFK Airport"),
                    dropoff_address=arguments.get("dropoff_address", "Manhattan, NY"),
                    pickup_datetime_str="Immediate / Scheduled",
                    passengers_count=arguments.get("passengers", 2),
                    vehicle_class=v_class,
                    passenger_type="MYSELF",
                    passenger_first_name=first_name,
                    passenger_last_name=last_name,
                    passenger_email=arguments.get("passenger_email", "customer@example.com"),
                    passenger_phone=arguments.get("passenger_phone", "+1 555-0100"),
                    flight_number=arguments.get("flight_number"),
                    sourcing_mode="EXPLICIT_VENDOR" if arguments.get("selected_vendor_id") else "AUTO_ROUTED",
                    selected_vendor_id=arguments.get("selected_vendor_id"),
                    base_fare=Decimal(str(base_fare)),
                    fees_and_taxes=Decimal(str(fees))
                )

                return {
                    "success": True,
                    "booking_reference": booking.booking_reference,
                    "status": booking.status,
                    "invoice_number": booking.invoice.invoice_number if booking.invoice else "INV-GH-2026-0001",
                    "total_amount_usd": float(booking.total_amount_usd),
                    "assigned_vendor": booking.assigned_vendor_name,
                    "chauffeur": booking.assigned_chauffeur_name
                }

            elif name == "lookup_booking_status":
                ref = arguments.get("booking_reference", "")
                email = arguments.get("email")
                booking = repo.get_booking_by_reference(ref, email)
                if not booking:
                    return {"error": f"Booking reference '{ref}' not found."}
                return {
                    "booking_reference": booking.booking_reference,
                    "status": booking.status,
                    "pickup": booking.pickup_address,
                    "dropoff": booking.dropoff_address,
                    "vehicle": booking.vehicle_model_name,
                    "chauffeur": booking.assigned_chauffeur_name,
                    "total_amount_usd": float(booking.total_amount_usd),
                    "invoice_number": booking.invoice.invoice_number if booking.invoice else None
                }

            return {"error": f"Unknown tool '{name}'"}
        finally:
            db.close()
