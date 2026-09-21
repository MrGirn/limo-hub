"""
Model Context Protocol (MCP) Server for Global Limo Autonomous Operations.
Provides authenticated tool definitions and dispatch execution for external LLM agents:
- quote_multi_modal_itinerary: Calculates multi-leg global chauffeur and flight transfers
- validate_global_address: Queries Google Maps for standardized coordinates and validation
- query_vendor_fleet: Returns available luxury vehicle classes and TLC chauffeurs
- execute_autonomous_recovery: Dispatches disruption recovery for flight delay or chauffeur timeout
"""

import json
import logging
from typing import Dict, Any, List
from app.services.google_maps_service import GoogleMapsService
from app.services.itinerary_engine import ItineraryEngine
from app.services.autonomous_recovery_service import AutonomousRecoveryService
from app.database import db

logger = logging.getLogger("MCPServer")

# Official MCP Tool Manifest Definitions
MCP_TOOLS_MANIFEST = [
    {
        "name": "quote_multi_modal_itinerary",
        "description": "Calculates all-inclusive fixed rates, tolls, taxes, and 3-leg positioning for arbitrary N-leg multi-modal journeys across cities and countries.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Title of the itinerary"},
                "vehicle_class": {"type": "string", "enum": ["LUXURY_SUV", "FIRST_CLASS", "BUSINESS_VAN", "ELECTRIC_VIP", "BUSINESS_SEDAN"], "default": "LUXURY_SUV"},
                "legs": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "leg_mode": {"type": "string", "enum": ["CHAUFFEUR_RIDE", "FLIGHT", "TRAIN", "HELICOPTER_TRANSFER", "CROSS_BORDER_DRIVE"]},
                            "origin_address": {"type": "string"},
                            "origin_city": {"type": "string"},
                            "destination_address": {"type": "string"},
                            "destination_city": {"type": "string"},
                            "flight_number": {"type": "string"},
                            "train_number": {"type": "string"}
                        },
                        "required": ["origin_address", "destination_address"]
                    }
                }
            },
            "required": ["legs"]
        }
    },
    {
        "name": "validate_global_address",
        "description": "Validates and standardizes a street, hotel, airport, or train hall address using Google Maps Platform Geocoding API.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "address": {"type": "string", "description": "Address string to validate"}
            },
            "required": ["address"]
        }
    },
    {
        "name": "query_vendor_fleet",
        "description": "Returns active vendor depot garages, vehicle inventory, and chauffeurs on duty.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "Target city e.g. New York, London, Los Angeles, Paris"}
            }
        }
    }
]


class MCPServer:
    @classmethod
    def list_tools(cls) -> List[Dict[str, Any]]:
        return MCP_TOOLS_MANIFEST

    @classmethod
    def get_tools(cls) -> List[Dict[str, Any]]:
        return MCP_TOOLS_MANIFEST

    @classmethod
    def execute_tool(cls, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatches and securely executes an MCP tool call."""
        logger.info(f"Executing MCP Tool: {tool_name} with args {arguments}")
        
        if tool_name == "quote_multi_modal_itinerary":
            from app.domain_models import VehicleClass
            v_class = VehicleClass(arguments.get("vehicle_class", "LUXURY_SUV"))
            itin = ItineraryEngine.build_and_quote_itinerary(
                title=arguments.get("title", "MCP Multi-Modal Itinerary"),
                raw_legs=arguments.get("legs", []),
                vehicle_class=v_class
            )
            return {
                "status": "success",
                "itinerary": itin.model_dump(),
                "content": [{"type": "text", "text": itin.model_dump_json()}]
            }

        elif tool_name == "validate_global_address":
            res = GoogleMapsService.validate_and_geocode_address(arguments.get("address", ""))
            return {
                "status": "success",
                "validation": res,
                "content": [{"type": "text", "text": json.dumps(res)}]
            }

        elif tool_name == "query_vendor_fleet":
            city = arguments.get("city", "").lower()
            matching_vendors = [
                v.model_dump() for v in db.vendors.values()
                if not city or city in v.office_city.lower() or city in v.name.lower()
            ]
            matching_vehicles = [
                veh.model_dump() for veh in db.vehicles.values()
                if not matching_vendors or veh.vendor_id in [v["id"] for v in matching_vendors]
            ]
            payload = {
                "vendors": matching_vendors,
                "vehicles_available": matching_vehicles,
                "total_count": len(matching_vehicles)
            }
            return {
                "status": "success",
                "data": payload,
                "content": [{
                    "type": "text",
                    "text": json.dumps(payload)
                }]
            }

        else:
            return {"isError": True, "status": "error", "content": [{"type": "text", "text": f"Tool '{tool_name}' not found."}]}


ModelContextProtocolServer = MCPServer

