"""
Multi-Region Geo-Federation Service for Global Hub.
Manages identical Global Hub instances deployed across worldwide geo-regions.
Provides peer discovery, gossip heartbeat, authoritative market routing, and cross-region handshakes.
"""

from __future__ import annotations
import os
import uuid
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timezone
from decimal import Decimal

from packages.shared.domain_models import (
    GeoRegion, HubNodeState, HubNodeHealthStatus, CrossRegionLegHandshake, VehicleClass
)
from packages.shared.protocol_contracts import (
    PeerGossipHeartbeatDTO, CrossRegionLegHandshakeDTO
)

logger = logging.getLogger("GlobalHub.GeoFederation")

# Global City to GeoRegion Authoritative Mapping
CITY_REGION_MAP: Dict[str, GeoRegion] = {
    # US_EAST
    "new york": GeoRegion.US_EAST,
    "nyc": GeoRegion.US_EAST,
    "jfk": GeoRegion.US_EAST,
    "philadelphia": GeoRegion.US_EAST,
    "philly": GeoRegion.US_EAST,
    "boston": GeoRegion.US_EAST,
    "miami": GeoRegion.US_EAST,
    "washington dc": GeoRegion.US_EAST,
    "atlanta": GeoRegion.US_EAST,
    
    # US_WEST
    "los angeles": GeoRegion.US_WEST,
    "lax": GeoRegion.US_WEST,
    "san francisco": GeoRegion.US_WEST,
    "sfo": GeoRegion.US_WEST,
    "las vegas": GeoRegion.US_WEST,
    "aspen": GeoRegion.US_WEST,
    "seattle": GeoRegion.US_WEST,
    
    # EU_WEST (UK & Ireland)
    "london": GeoRegion.EU_WEST,
    "lhr": GeoRegion.EU_WEST,
    "manchester": GeoRegion.EU_WEST,
    "dublin": GeoRegion.EU_WEST,
    "edinburgh": GeoRegion.EU_WEST,
    
    # EU_CENTRAL (Continental Europe)
    "paris": GeoRegion.EU_CENTRAL,
    "cdg": GeoRegion.EU_CENTRAL,
    "frankfurt": GeoRegion.EU_CENTRAL,
    "zurich": GeoRegion.EU_CENTRAL,
    "geneva": GeoRegion.EU_CENTRAL,
    "milan": GeoRegion.EU_CENTRAL,
    "rome": GeoRegion.EU_CENTRAL,
    "nice": GeoRegion.EU_CENTRAL,
    "monaco": GeoRegion.EU_CENTRAL,
    
    # ME_CENTRAL (Middle East)
    "dubai": GeoRegion.ME_CENTRAL,
    "dxb": GeoRegion.ME_CENTRAL,
    "abu dhabi": GeoRegion.ME_CENTRAL,
    "doha": GeoRegion.ME_CENTRAL,
    "riyadh": GeoRegion.ME_CENTRAL,
    
    # AP_SOUTHEAST (Asia Pacific South & Oceania)
    "singapore": GeoRegion.AP_SOUTHEAST,
    "sin": GeoRegion.AP_SOUTHEAST,
    "sydney": GeoRegion.AP_SOUTHEAST,
    "melbourne": GeoRegion.AP_SOUTHEAST,
    "bangkok": GeoRegion.AP_SOUTHEAST,
    
    # AP_NORTHEAST (Asia Pacific North)
    "tokyo": GeoRegion.AP_NORTHEAST,
    "hnd": GeoRegion.AP_NORTHEAST,
    "nrt": GeoRegion.AP_NORTHEAST,
    "seoul": GeoRegion.AP_NORTHEAST,
    "hong kong": GeoRegion.AP_NORTHEAST,
}


class GeoFederationService:
    """
    Manages geo-distributed Global Hub node clustering and cross-region coordination.
    """
    _current_node_id: str = os.getenv("HUB_NODE_ID", f"hub-node-{uuid.uuid4().hex[:6]}")
    _current_region: GeoRegion = GeoRegion(os.getenv("GEO_REGION_ID", GeoRegion.US_EAST.value))
    _current_endpoint: str = os.getenv("HUB_ENDPOINT_URL", "http://localhost:8000")
    
    # Peer nodes registry
    _peer_registry: Dict[str, HubNodeState] = {}
    _handshakes_log: List[CrossRegionLegHandshake] = []

    @classmethod
    def initialize_default_cluster(cls, current_region: Optional[GeoRegion] = None):
        """Initializes default global cluster nodes across key continents."""
        if current_region:
            cls._current_region = current_region

        # Register self
        self_state = HubNodeState(
            node_id=cls._current_node_id,
            geo_region=cls._current_region,
            endpoint_url=cls._current_endpoint,
            health_status=HubNodeHealthStatus.HEALTHY,
            latency_ms=2.0,
            active_affiliates_count=180,
            active_trips_count=45,
            is_authoritative_for_regions=[cls._current_region]
        )
        cls._peer_registry[cls._current_node_id] = self_state

        # Register standard default peer nodes for global network
        default_peers = [
            HubNodeState(
                node_id="hub-us-east-prod",
                geo_region=GeoRegion.US_EAST,
                endpoint_url="https://us-east.clearinghouse.limoglobal.com",
                health_status=HubNodeHealthStatus.HEALTHY,
                latency_ms=14.0,
                active_affiliates_count=320,
                active_trips_count=82,
                is_authoritative_for_regions=[GeoRegion.US_EAST]
            ),
            HubNodeState(
                node_id="hub-us-west-prod",
                geo_region=GeoRegion.US_WEST,
                endpoint_url="https://us-west.clearinghouse.limoglobal.com",
                health_status=HubNodeHealthStatus.HEALTHY,
                latency_ms=42.0,
                active_affiliates_count=210,
                active_trips_count=48,
                is_authoritative_for_regions=[GeoRegion.US_WEST]
            ),
            HubNodeState(
                node_id="hub-eu-west-prod",
                geo_region=GeoRegion.EU_WEST,
                endpoint_url="https://eu-west.clearinghouse.limoglobal.com",
                health_status=HubNodeHealthStatus.HEALTHY,
                latency_ms=78.0,
                active_affiliates_count=190,
                active_trips_count=39,
                is_authoritative_for_regions=[GeoRegion.EU_WEST]
            ),
            HubNodeState(
                node_id="hub-eu-central-prod",
                geo_region=GeoRegion.EU_CENTRAL,
                endpoint_url="https://eu-central.clearinghouse.limoglobal.com",
                health_status=HubNodeHealthStatus.HEALTHY,
                latency_ms=88.0,
                active_affiliates_count=240,
                active_trips_count=61,
                is_authoritative_for_regions=[GeoRegion.EU_CENTRAL]
            ),
            HubNodeState(
                node_id="hub-me-central-prod",
                geo_region=GeoRegion.ME_CENTRAL,
                endpoint_url="https://me-central.clearinghouse.limoglobal.com",
                health_status=HubNodeHealthStatus.HEALTHY,
                latency_ms=130.0,
                active_affiliates_count=145,
                active_trips_count=32,
                is_authoritative_for_regions=[GeoRegion.ME_CENTRAL]
            ),
            HubNodeState(
                node_id="hub-ap-southeast-prod",
                geo_region=GeoRegion.AP_SOUTHEAST,
                endpoint_url="https://ap-southeast.clearinghouse.limoglobal.com",
                health_status=HubNodeHealthStatus.HEALTHY,
                latency_ms=160.0,
                active_affiliates_count=160,
                active_trips_count=28,
                is_authoritative_for_regions=[GeoRegion.AP_SOUTHEAST, GeoRegion.AP_NORTHEAST]
            ),
        ]

        for peer in default_peers:
            if peer.node_id != cls._current_node_id:
                cls._peer_registry[peer.node_id] = peer

    @classmethod
    def get_current_node_state(cls) -> HubNodeState:
        """Returns metadata and health of this running instance."""
        if cls._current_node_id not in cls._peer_registry:
            cls.initialize_default_cluster()
        return cls._peer_registry[cls._current_node_id]

    @classmethod
    def list_all_nodes(cls) -> List[HubNodeState]:
        """Returns all discovered nodes across the worldwide mesh."""
        if not cls._peer_registry:
            cls.initialize_default_cluster()
        return list(cls._peer_registry.values())

    @classmethod
    def resolve_region_for_location(cls, city_or_address: str) -> GeoRegion:
        """Determines the authoritative GeoRegion for a given city or airport name."""
        clean = city_or_address.strip().lower()
        for city_key, region in CITY_REGION_MAP.items():
            if city_key in clean:
                return region
        
        # Fallback to local node's default region
        return cls._current_region

    @classmethod
    def find_authoritative_node_for_region(cls, target_region: GeoRegion) -> HubNodeState:
        """
        Finds the healthiest and lowest-latency Global Hub node authoritative for the given region.
        Provides automatic failover if the primary regional node is unreachable.
        """
        if not cls._peer_registry:
            cls.initialize_default_cluster()

        # 1. Primary candidates directly serving this region
        candidates = [
            n for n in cls._peer_registry.values()
            if (n.geo_region == target_region or target_region in n.is_authoritative_for_regions)
            and n.health_status == HubNodeHealthStatus.HEALTHY
        ]

        if candidates:
            # Pick lowest latency candidate
            candidates.sort(key=lambda x: x.latency_ms)
            return candidates[0]

        # 2. Failover: Any healthy node sorted by latency
        healthy_nodes = [n for n in cls._peer_registry.values() if n.health_status == HubNodeHealthStatus.HEALTHY]
        if healthy_nodes:
            healthy_nodes.sort(key=lambda x: x.latency_ms)
            logger.warning(f"Regional node for {target_region.value} unavailable. Failing over to {healthy_nodes[0].node_id}")
            return healthy_nodes[0]

        # 3. Ultimate fallback: Return self
        return cls.get_current_node_state()

    @classmethod
    def record_peer_heartbeat(cls, gossip: PeerGossipHeartbeatDTO) -> HubNodeState:
        """Ingests a gossip heartbeat from an identical peer instance."""
        target_region = GeoRegion(gossip.source_region) if gossip.source_region in GeoRegion.__members__ else GeoRegion.US_EAST
        supported = [GeoRegion(r) for r in gossip.supported_regions if r in GeoRegion.__members__]

        state = HubNodeState(
            node_id=gossip.source_node_id,
            geo_region=target_region,
            endpoint_url=gossip.endpoint_url,
            health_status=HubNodeHealthStatus.HEALTHY,
            active_affiliates_count=gossip.active_affiliates_count,
            is_authoritative_for_regions=supported or [target_region],
            last_heartbeat_utc=datetime.now(timezone.utc)
        )
        cls._peer_registry[gossip.source_node_id] = state
        return state

    @classmethod
    def execute_cross_region_handshake(
        cls,
        itinerary_id: str,
        leg_id: str,
        pickup_city: str,
        pickup_address: str,
        dropoff_address: str,
        pickup_time_utc: datetime,
        vehicle_class: VehicleClass,
        estimated_clearing_fare_usd: Optional[Decimal] = None
    ) -> CrossRegionLegHandshake:
        """
        Delegates an out-of-region ride leg to the authoritative remote Global Hub node.
        """
        target_region = cls.resolve_region_for_location(pickup_city)
        authoritative_node = cls.find_authoritative_node_for_region(target_region)

        handshake = CrossRegionLegHandshake(
            itinerary_id=itinerary_id,
            leg_id=leg_id,
            origin_region=cls._current_region,
            destination_region=target_region,
            pickup_address=pickup_address,
            destination_address=dropoff_address,
            pickup_city=pickup_city,
            pickup_time_utc=pickup_time_utc,
            vehicle_class=vehicle_class,
            allocated_hub_node_id=authoritative_node.node_id,
            clearing_fare_usd=estimated_clearing_fare_usd or Decimal("220.00"),
            status="DELEGATED_TO_REGIONAL_HUB"
        )
        cls._handshakes_log.append(handshake)
        logger.info(
            f"Cross-region handshake created: leg {leg_id} ({pickup_city}) -> {authoritative_node.node_id} ({target_region.value})"
        )
        return handshake

    @classmethod
    def get_handshake_log(cls) -> List[CrossRegionLegHandshake]:
        return cls._handshakes_log


# Pre-initialize default cluster on module load
GeoFederationService.initialize_default_cluster()
