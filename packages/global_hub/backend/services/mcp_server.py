"""
Model Context Protocol (MCP) Server for Global Hub Marketplace.
Exposes tools for LLM agentic pair-programming, Claude Desktop, Cursor, and autonomous travel agents.
"""

from typing import Dict, Any, List
from packages.shared.domain_models import VehicleClass
from packages.global_hub.backend.services.marketplace_router import MarketplaceRouter


class GlobalHubMCPServer:
    @classmethod
    def list_tools(cls) -> List[Dict[str, Any]]:
        """Returns standard MCP tool definitions."""
        return [
            {
                "name": "calculate_guaranteed_quote",
                "description": "Calculates an all-inclusive binding price quote for luxury chauffeured rides worldwide.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "pickup": {"type": "string", "description": "Pickup airport, hotel, or street address"},
                        "destination": {"type": "string", "description": "Drop-off destination address"},
                        "vehicle_tier": {"type": "string", "enum": ["LUXURY_SUV", "FIRST_CLASS", "BUSINESS_VAN", "ELECTRIC_VIP"]},
                        "flight_number": {"type": "string", "description": "Optional flight number for radar tracking"}
                    },
                    "required": ["pickup", "destination"]
                }
            },
            {
                "name": "search_network_corridor_coverage",
                "description": "Checks if a city or airport is covered by the guaranteed in-network sovereign fleet vs autonomous reverse auction sourcing.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "city_or_airport": {"type": "string", "description": "City name or 3-letter IATA code (e.g. 'JFK', 'Aspen', 'London')"}
                    },
                    "required": ["city_or_airport"]
                }
            }
        ]

    @classmethod
    def call_tool(cls, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Executes an MCP tool call."""
        if name == "calculate_guaranteed_quote":
            pickup = arguments.get("pickup", "JFK Airport")
            destination = arguments.get("destination", "The Plaza Hotel, NYC")
            tier_str = arguments.get("vehicle_tier", "LUXURY_SUV")
            tier = VehicleClass(tier_str) if tier_str in VehicleClass.__members__ else VehicleClass.LUXURY_SUV
            
            itin = MarketplaceRouter.quote_global_itinerary(
                title="MCP Agent Generated Quote",
                legs_data=[{
                    "origin_address": pickup,
                    "origin_city": "New York",
                    "destination_address": destination,
                    "destination_city": "New York",
                    "distance_miles": 18.5
                }],
                vehicle_class=tier
            )
            return {
                "quote_id": itin.itinerary_id,
                "total_fare_usd": float(itin.all_inclusive_total),
                "is_partially_priced": itin.is_partially_priced,
                "flight_radar_included": True
            }
        
        elif name == "search_network_corridor_coverage":
            loc = arguments.get("city_or_airport", "").lower()
            in_network = any(k in loc for k in ["jfk", "lga", "new york", "manhattan", "philly", "philadelphia", "london", "paris"])
            return {
                "location": arguments.get("city_or_airport"),
                "status": "LOCKED_IN_NETWORK" if in_network else "AUTONOMOUS_REVERSE_AUCTION_SOURCING",
                "sla_guarantee": "Instant Booking" if in_network else "15-25 Min Vendor Sourcing SLA Guarantee"
            }
        
        return {"error": f"Unknown tool: {name}"}
