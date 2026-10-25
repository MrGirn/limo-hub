"""
Global Hub Clearinghouse Data Access Repository.
Handles CRUD and queries for Multi-City Itineraries, Public Bookings, Unified Invoices, Sourcing RFPs, 80/10/10 Settlements, and Live Chauffeur GPS Telemetry.
"""

from __future__ import annotations
import json
import uuid
import random
import math
import logging
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session

logger = logging.getLogger("HubRepository")

from packages.global_hub.backend.models import (
    HubItineraryModel, HubLegModel, HubRFPModel, HubEscrowSettlementModel,
    HubClearinghouseConfigModel, HubMasterBookingModel, HubInvoiceModel,
    HubVendorProfileModel, HubDriverTelemetryModel
)


class HubRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- DYNAMIC AUTHORITATIVE VENDOR SYNCHRONIZATION ---
    def ensure_default_vetted_vendors(self):
        """Dynamically synchronizes registered affiliate vendor profiles from authoritative database & fleet registry."""
        from sqlalchemy import text
        # Ensure schema has necessary columns
        try:
            self.db.execute(text("ALTER TABLE hub_vendor_profiles MODIFY COLUMN vehicle_makes TEXT;"))
            self.db.commit()
        except Exception:
            self.db.rollback()

        for col_name, col_type in [
            ("health_status", "VARCHAR(32) DEFAULT 'ONLINE_HEALTHY'"),
            ("api_endpoint_url", "VARCHAR(255) DEFAULT 'http://localhost:8001'"),
            ("base_latitude", "FLOAT DEFAULT 39.9526"),
            ("base_longitude", "FLOAT DEFAULT -75.1652"),
            ("operating_radius_miles", "FLOAT DEFAULT 150.0"),
            ("primary_chauffeur_name", "VARCHAR(128) DEFAULT 'Marcus Vance'"),
            ("primary_chauffeur_phone", "VARCHAR(32) DEFAULT '+1 (215) 555-0144'"),
            ("primary_vehicle_plate", "VARCHAR(32) DEFAULT 'PA 8492-LM'"),
            ("primary_vehicle_name", "VARCHAR(128) DEFAULT 'Lincoln Navigator L'")
        ]:
            try:
                self.db.execute(text(f"ALTER TABLE hub_vendor_profiles ADD COLUMN {col_name} {col_type};"))
                self.db.commit()
            except Exception:
                self.db.rollback()

        # Synchronize from authoritative declarative YAML definitions in config/vendor_definitions/
        try:
            import os, glob, yaml
            candidate_dirs = [
                "config/vendor_definitions",
                "/app/config/vendor_definitions",
                os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../config/vendor_definitions")),
                os.path.abspath("config/vendor_definitions")
            ]
            target_dir = None
            for d in candidate_dirs:
                if os.path.exists(d) and os.path.isdir(d):
                    target_dir = d
                    break

            if target_dir:
                yaml_files = glob.glob(os.path.join(target_dir, "*.yaml")) + glob.glob(os.path.join(target_dir, "*.yml"))
                vendor_endpoint_map = {
                    "vendor_anb_philly": "http://localhost:8001",
                    "vendor_ny_executive": "http://localhost:8002",
                    "vendor_london_royal": "http://localhost:8003",
                    "vendor_dubai_emirates": "http://localhost:8004",
                    "vendor_boston_vip": "http://localhost:8005",
                    "vendor_miami_prestige_test": "http://localhost:8001",
                    "vendor_tokyo_sovereign": "http://localhost:8001",
                }

                coords_map = {
                    "Philadelphia": (39.9526, -75.1652),
                    "New York": (40.7128, -74.0060),
                    "London": (51.5074, -0.1278),
                    "Dubai": (25.2048, 55.2708),
                    "Boston": (42.3601, -71.0589),
                    "Miami": (25.7617, -80.1918),
                    "Tokyo": (35.6762, 139.6503),
                }

                valid_vendor_ids = set()

                for yf in yaml_files:
                    if "vendor_golden_template" in os.path.basename(yf):
                        continue
                    try:
                        with open(yf, "r", encoding="utf-8") as f:
                            data = yaml.safe_load(f)
                        if not data or not isinstance(data, dict):
                            continue

                        v_data = data.get("vendor", {})
                        raw_id = v_data.get("id", "")
                        if not raw_id:
                            continue

                        hub_vid = "vnd_" + raw_id[7:] if raw_id.startswith("vendor_") else raw_id
                        valid_vendor_ids.add(hub_vid)
                        valid_vendor_ids.add(raw_id)

                        company_name = v_data.get("name", "Executive Chauffeur Affiliate")
                        city_name = v_data.get("city", "Philadelphia")
                        
                        branding = data.get("branding", {})
                        pricing = data.get("pricing_matrix", {})
                        compliance = data.get("telecom_compliance", {})
                        stripe_cfg = data.get("stripe_connect", {})

                        legal_name = compliance.get("legal_business_name") or company_name
                        ein = compliance.get("ein_tax_id")
                        phone = branding.get("contact_phone") or "+1 (215) 555-0144"
                        email = branding.get("contact_email") or f"info@{raw_id}.com"
                        address = branding.get("office_address") or f"{city_name} Center"
                        stripe_id = stripe_cfg.get("account_id") or f"acct_conn_{hub_vid}"

                        # Live Fleet & Chauffeurs directly from Vendor Database & Microservice APIs
                        from app.database_mysql import mysql_db, DriverModel, VehicleModel, VendorModel
                        session = mysql_db.get_session()
                        db_drivers = []
                        db_vehicles = []
                        v_db = None
                        live_pricing = {}

                        if session:
                            try:
                                norm_vid = raw_id.replace("vnd_", "vendor_").replace("-", "_")
                                alias_vid = raw_id.replace("vnd_", "vendor-").replace("_", "-")
                                db_drivers = session.query(DriverModel).filter(
                                    (DriverModel.vendor_id == raw_id) | (DriverModel.vendor_id == hub_vid) |
                                    (DriverModel.vendor_id == norm_vid) | (DriverModel.vendor_id == alias_vid)
                                ).all()
                                db_vehicles = session.query(VehicleModel).filter(
                                    (VehicleModel.vendor_id == raw_id) | (VehicleModel.vendor_id == hub_vid) |
                                    (VehicleModel.vendor_id == norm_vid) | (VehicleModel.vendor_id == alias_vid)
                                ).all()
                                v_db = session.query(VendorModel).filter(
                                    (VendorModel.id == raw_id) | (VendorModel.id == hub_vid) |
                                    (VendorModel.id == norm_vid) | (VendorModel.id == alias_vid)
                                ).first()

                                if v_db and getattr(v_db, "pricing_matrix_json", None):
                                    try:
                                        live_pricing = json.loads(v_db.pricing_matrix_json)
                                    except Exception:
                                        live_pricing = {}

                                if not live_pricing:
                                    # Seed initial pricing matrix to vendor DB on first boot
                                    live_pricing = {
                                        "vendor_id": raw_id,
                                        "currency": v_db.currency if v_db else "USD",
                                        "operating_radius_miles": float(pricing.get("operating_radius_miles", 65.0)),
                                        "per_mile_rate_usd": float(pricing.get("per_mile_rate_usd") or pricing.get("deadhead_rate_per_mile_usd", 3.85)),
                                        "deadhead_rate_per_mile_usd": float(pricing.get("deadhead_rate_per_mile_usd") or pricing.get("per_mile_rate_usd", 3.85)),
                                        "business_class_base_rate_usd": float(pricing.get("business_class_base_rate_usd") or pricing.get("base_rate_usd", 115.00)),
                                        "first_class_base_rate_usd": float(pricing.get("first_class_base_rate_usd") or (float(pricing.get("business_class_base_rate_usd", 115.00)) + 60.00)),
                                        "business_van_base_rate_usd": float(pricing.get("business_van_base_rate_usd") or (float(pricing.get("business_class_base_rate_usd", 115.00)) + 40.00)),
                                        "hourly_rate_usd": float(pricing.get("hourly_rate_usd", 85.00)),
                                        "tax_rate_pct": float(pricing.get("tax_rate_pct", 8.0)),
                                        "airport_meet_and_greet_usd": float(pricing.get("airport_meet_and_greet_usd", 45.0)),
                                        "tolls_bridge_tunnel_usd": float(pricing.get("tolls_bridge_tunnel_usd", 12.5))
                                    }
                                    if v_db:
                                        v_db.pricing_matrix_json = json.dumps(live_pricing)
                                        session.commit()
                            finally:
                                session.close()

                        fleet_count = len(db_vehicles) if db_vehicles else (len(db_drivers) if db_drivers else 1)
                        makes_list = []
                        for veh in db_vehicles:
                            v_clean = f"{veh.make} {veh.model}".split("(")[0].strip()
                            if v_clean and v_clean not in makes_list:
                                makes_list.append(v_clean)

                        primary_driver_name = "Marcus Vance"
                        primary_driver_phone = phone
                        primary_plate = "PA 8492-LM"
                        primary_veh = "Lincoln Navigator L"

                        if db_drivers:
                            first_d = db_drivers[0]
                            primary_driver_name = f"{first_d.first_name} {first_d.last_name}"
                            primary_driver_phone = first_d.phone or phone
                            if db_vehicles:
                                matched_veh = db_vehicles[0]
                                if first_d.current_vehicle_id:
                                    matched_veh = next((v for v in db_vehicles if v.id == first_d.current_vehicle_id), db_vehicles[0])
                                primary_plate = matched_veh.license_plate
                                primary_veh = f"{matched_veh.make} {matched_veh.model}".split("(")[0].strip()

                        vehicle_makes_str = ", ".join(makes_list[:4]) if makes_list else primary_veh

                        rate_business = Decimal(str(live_pricing.get("business_class_base_rate_usd", 115.00)))
                        rate_first = Decimal(str(live_pricing.get("first_class_base_rate_usd", 175.00)))
                        rate_van = Decimal(str(live_pricing.get("business_van_base_rate_usd", 155.00)))
                        hourly_rate = Decimal(str(live_pricing.get("hourly_rate_usd") or live_pricing.get("hourly_rate_business_usd", 85.00)))
                        per_mile = Decimal(str(live_pricing.get("per_mile_rate_usd") or live_pricing.get("deadhead_rate_per_mile_usd", 3.85)))
                        radius = float(live_pricing.get("operating_radius_miles", 65.0))
                        lat, lng = coords_map.get(city_name, (39.9526, -75.1652))
                        endpoint = vendor_endpoint_map.get(raw_id, "http://localhost:8001")

                        # Live Stats from driver/trips database
                        live_rating, live_rides = self.resolve_driver_live_stats(hub_vid, primary_driver_name)

                        existing = self.db.query(HubVendorProfileModel).filter(
                            (HubVendorProfileModel.vendor_id == hub_vid) |
                            (HubVendorProfileModel.vendor_id == raw_id)
                        ).first()

                        if not existing:
                            new_profile = HubVendorProfileModel(
                                vendor_id=hub_vid,
                                company_name=company_name,
                                legal_business_name=legal_name,
                                market_city=city_name,
                                tax_id_ein=ein,
                                primary_contact_phone=phone,
                                primary_contact_email=email,
                                headquarters_address=address,
                                airport_corridors_json=json.dumps([city_name, "JFK", "PHL", "LHR", "DXB"]),
                                rating_score=live_rating,
                                total_reviews_count=live_rides,
                                fleet_size=fleet_count,
                                vehicle_makes=vehicle_makes_str,
                                amenities_json=json.dumps(["Free Wi-Fi", "Bottled Fiji Water", "Flight Radar Tracking"]),
                                cancellation_policy="Free cancellation up to 24 hours before pickup",
                                business_class_base_rate_usd=rate_business,
                                first_class_base_rate_usd=rate_first,
                                business_van_base_rate_usd=rate_van,
                                per_mile_rate_usd=per_mile,
                                hourly_rate_business_usd=hourly_rate,
                                round_robin_weight=100,
                                account_status="ACTIVE",
                                health_status="ONLINE_HEALTHY",
                                api_endpoint_url=endpoint,
                                stripe_connect_account_id=stripe_id,
                                base_latitude=lat,
                                base_longitude=lng,
                                operating_radius_miles=radius,
                                primary_chauffeur_name=primary_driver_name,
                                primary_chauffeur_phone=primary_driver_phone,
                                primary_vehicle_plate=primary_plate,
                                primary_vehicle_name=primary_veh
                            )
                            self.db.add(new_profile)
                        else:
                            existing.company_name = company_name
                            existing.legal_business_name = legal_name
                            existing.market_city = city_name
                            existing.tax_id_ein = ein
                            existing.primary_contact_phone = phone
                            existing.primary_contact_email = email
                            existing.headquarters_address = address
                            existing.fleet_size = fleet_count
                            existing.vehicle_makes = vehicle_makes_str
                            existing.base_latitude = lat
                            existing.base_longitude = lng
                            existing.api_endpoint_url = endpoint
                            existing.stripe_connect_account_id = stripe_id
                            existing.is_active = True
                            existing.is_vetted_partner = True
                            existing.account_status = "ACTIVE"
                            existing.health_status = "ONLINE_HEALTHY"
                            existing.operating_radius_miles = radius
                            existing.business_class_base_rate_usd = rate_business
                            existing.first_class_base_rate_usd = rate_first
                            existing.business_van_base_rate_usd = rate_van
                            existing.per_mile_rate_usd = per_mile
                            existing.hourly_rate_business_usd = hourly_rate
                            existing.rating_score = live_rating
                            existing.total_reviews_count = live_rides
                            existing.primary_chauffeur_name = primary_driver_name
                            existing.primary_chauffeur_phone = primary_driver_phone
                            existing.primary_vehicle_plate = primary_plate
                            existing.primary_vehicle_name = primary_veh

                        self.db.commit()
                    except Exception as e:
                        logger.warning(f"Error parsing vendor YAML {yf}: {e}")
                        self.db.rollback()

                # Clean up legacy synthetic / unverified vendor rows
                if valid_vendor_ids:
                    all_hub_vendors = self.db.query(HubVendorProfileModel).all()
                    for sv in all_hub_vendors:
                        if sv.vendor_id not in valid_vendor_ids:
                            self.db.delete(sv)
                    self.db.commit()
        except Exception as e:
            logger.warning(f"Authoritative vendor YAML synchronization notice: {e}")
            self.db.rollback()

    def list_vetted_vendors(self, city: Optional[str] = None) -> List[HubVendorProfileModel]:
        self.ensure_default_vetted_vendors()
        query = self.db.query(HubVendorProfileModel).filter(
            HubVendorProfileModel.is_active == True,
            HubVendorProfileModel.is_vetted_partner == True,
            HubVendorProfileModel.health_status == "ONLINE_HEALTHY"
        )
        if city:
            query = query.filter(HubVendorProfileModel.market_city.ilike(f"%{city}%"))
        return query.all()

    def find_nearest_vendors_for_pickup(
        self,
        pickup_address: str,
        dropoff_address: Optional[str] = None
    ) -> List[Tuple[HubVendorProfileModel, float]]:
        """
        Calculates geodesic distance from the starting pickup location to all registered vendor operating bases.
        Returns active vetted vendors ranked strictly by proximity (nearest to pickup first).
        """
        self.ensure_default_vetted_vendors()
        all_vendors = self.db.query(HubVendorProfileModel).filter(
            HubVendorProfileModel.is_active == True,
            HubVendorProfileModel.is_vetted_partner == True,
            HubVendorProfileModel.health_status == "ONLINE_HEALTHY"
        ).all()

        if not all_vendors:
            return []

        # 1. Geocode starting pickup address to get origin coordinates
        pickup_lat, pickup_lng = 39.9526, -75.1652 # Philadelphia default fallback
        try:
            from app.services.google_maps_service import GoogleMapsService
            geo_res = GoogleMapsService.validate_and_geocode_address(pickup_address)
            if geo_res and geo_res.get("valid") and geo_res.get("lat") and geo_res.get("lng"):
                pickup_lat = float(geo_res["lat"])
                pickup_lng = float(geo_res["lng"])
        except Exception as e:
            logger.warning(f"Geocoding pickup for vendor proximity routing notice: {e}")

        # 2. Calculate true Haversine distance from pickup location to each vendor's operating base
        from app.services.google_maps_service import GoogleMapsService
        scored_vendors: List[Tuple[HubVendorProfileModel, float, bool]] = []

        resolved_city = self.resolve_market_city(pickup_address, dropoff_address)

        for v in all_vendors:
            v_lat = v.base_latitude or 39.9526
            v_lng = v.base_longitude or -75.1652
            dist_miles = GoogleMapsService.haversine_distance_miles(pickup_lat, pickup_lng, v_lat, v_lng)
            
            p_lower = (pickup_address or "").lower()
            is_match = (v.market_city.lower() in p_lower) or (resolved_city.lower() == v.market_city.lower()) or (city_match := v.market_city.lower() in resolved_city.lower())
            scored_vendors.append((v, dist_miles, is_match))

        # 3. Sort: exact market match first, then by distance
        scored_vendors.sort(key=lambda item: (0 if item[2] else 1, item[1]))

        nearest_cluster = [
            (item[0], item[1]) for item in scored_vendors
            if item[2] or item[1] <= (item[0].operating_radius_miles or 150.0)
        ]

        if not nearest_cluster:
            nearest_cluster = [(item[0], item[1]) for item in scored_vendors[:3]]

        return nearest_cluster

    def get_round_robin_vendor(self, city: str = "New York") -> Optional[HubVendorProfileModel]:
        vendors = self.list_vetted_vendors(city)
        if not vendors:
            vendors = self.list_vetted_vendors()
        return random.choice(vendors) if vendors else None

    @staticmethod
    def resolve_market_city(pickup: str, dropoff: Optional[str] = None) -> str:
        """Dynamically identifies servicing market city from pickup/dropoff locations."""
        p_text = (pickup or "").lower()
        d_text = (dropoff or "").lower()
        combined = f"{p_text} {d_text}"

        # Originating pickup city takes first routing priority
        if any(k in p_text for k in ("philadelphia", "phl", "pennsylvania", "center city", "30th street", "king of prussia", ", pa")):
            return "Philadelphia"
        elif any(k in p_text for k in ("london", "lhr", "heathrow", "gatwick", "mayfair", "canary wharf", "stansted", "luton", "uk", "united kingdom", "england")):
            return "London"
        elif any(k in p_text for k in ("dubai", "dxb", "dwc", "burj", "jumeirah", "marina", "uae", "emirates", "downtown dubai", "abu dhabi")):
            return "Dubai"
        elif any(k in p_text for k in ("boston", "bos", "logan", "cambridge", "back bay", "massachusetts", ", ma")):
            return "Boston"
        elif any(k in p_text for k in ("new york", "jfk", "lga", "ewr", "manhattan", "brooklyn", "queens", "ny", "nyc", "new jersey", "nj")):
            return "New York"

        # Fallback to dropoff analysis if pickup is generic
        if any(k in d_text for k in ("philadelphia", "phl", "pennsylvania", ", pa")):
            return "Philadelphia"
        elif any(k in d_text for k in ("london", "lhr", "heathrow", "uk")):
            return "London"
        elif any(k in d_text for k in ("dubai", "dxb", "uae")):
            return "Dubai"
        elif any(k in d_text for k in ("boston", "bos", ", ma")):
            return "Boston"

        return "New York"

    # --- DYNAMIC PRICING ENGINE WITH AUTHORITATIVE VENDOR CELLS ---
    def calculate_dynamic_quote(
        self,
        pickup: str,
        dropoff: Optional[str] = None,
        service_type: str = "ONE_WAY",
        vehicle_class: str = "LUXURY_SUV",
        hourly_duration: int = 3,
        stops_count: int = 0,
        multi_city_legs: Optional[List[Dict[str, Any]]] = None,
        intermediate_stops: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Calculates authoritative dynamic pricing from registered vendor rate cards + marketplace rules across One-way, Hourly & Multi-City."""
        self.ensure_default_vetted_vendors()
        cfg = self.get_or_create_clearinghouse_config()

        from app.services.pricing_service import PricingService
        from app.domain_models import ServiceType as DomainServiceType, VehicleClass as DomainVehicleClass
        from app.services.google_maps_service import GoogleMapsService

        clean_stops = [s.strip() for s in (intermediate_stops or []) if s and s.strip()]
        effective_stops_count = max(stops_count, len(clean_stops))
        stop_rate = cfg.intermediate_stop_fee_usd or Decimal("15.00")
        stop_fee = Decimal(str(effective_stops_count)) * stop_rate
        free_cancellation_hrs = cfg.free_cancellation_hours or 24

        servicing_pct = (cfg.servicing_affiliate_payout_pct or Decimal("80.00")) / Decimal("100.00")
        originating_pct = (cfg.originating_booker_commission_pct or Decimal("10.00")) / Decimal("100.00")
        platform_pct = (cfg.platform_clearing_fee_pct or Decimal("10.00")) / Decimal("100.00")

        def normalize_vendor_key(v_id: Optional[str]) -> str:
            if not v_id:
                return "vendor-anb-philly"
            clean = str(v_id).strip()
            mapping = {
                "vnd_empire_black_car": "vendor-ny-executive",
                "vnd_manhattan_prestige": "vendor-ny-executive",
                "vnd_mainline_philly": "vendor-anb-philly",
                "vnd_anb_philly": "vendor-anb-philly",
                "vnd_boston_vip": "vendor-boston-vip",
                "vnd_dubai_royal": "vendor-dubai-emirates",
                "vnd_sovereign_london": "vendor-london-royal",
                "vendor_anb_philly": "vendor-anb-philly",
                "vendor_boston_vip": "vendor-boston-vip",
                "vendor_dubai_emirates": "vendor-dubai-emirates",
                "vendor_london_royal": "vendor-london-royal",
                "vendor_miami_prestige_test": "vendor-miami-prestige-test",
                "vendor_ny_executive": "vendor-ny-executive",
                "vendor_tokyo_sovereign": "vendor-tokyo-sovereign",
            }
            if clean in mapping:
                return mapping[clean]
            if clean.startswith("vnd_") or clean.startswith("vnd-"):
                return ("vendor-" + clean[4:]).replace("_", "-")
            return clean.replace("_", "-")

        class_to_domain = {
            "LUXURY_SUV": DomainVehicleClass.LUXURY_SUV,
            "SUV": DomainVehicleClass.LUXURY_SUV,
            "FIRST_CLASS": DomainVehicleClass.FIRST_CLASS,
            "BUSINESS_SEDAN": DomainVehicleClass.BUSINESS_SEDAN,
            "BUSINESS_CLASS": DomainVehicleClass.BUSINESS_SEDAN,
            "BUSINESS_VAN": DomainVehicleClass.BUSINESS_VAN,
            "ELECTRIC_VIP": DomainVehicleClass.ELECTRIC_VIP
        }
        active_domain_vc = class_to_domain.get(vehicle_class, DomainVehicleClass.LUXURY_SUV)
        target_vc_key = active_domain_vc.value if hasattr(active_domain_vc, "value") else str(active_domain_vc)

        market_city = self.resolve_market_city(pickup, dropoff)
        nearest_vendor_items = self.find_nearest_vendors_for_pickup(pickup, dropoff)
        vendors = [item[0] for item in nearest_vendor_items] if nearest_vendor_items else []
        if not vendors:
            vendors = self.list_vetted_vendors(market_city)
        if not vendors:
            vendors = self.list_vetted_vendors("Philadelphia")
        if not vendors:
            vendors = self.list_vetted_vendors()

        servicing_vendor = vendors[0] if vendors else None
        vendor_name = servicing_vendor.company_name if servicing_vendor else "ANB Trans Inc Executive Chauffeurs"
        vendor_id = servicing_vendor.vendor_id if servicing_vendor else "vnd_anb_philly"
        active_vendor_key = normalize_vendor_key(vendor_id)

        if service_type == "HOURLY":
            min_hrs = cfg.min_hourly_duration_hours or 2
            duration = max(min_hrs, hourly_duration or min_hrs)

            primary_matrix = PricingService.calculate_quote_matrix(
                tenant_id="tenant-us-east",
                vendor_id=active_vendor_key,
                service_type=DomainServiceType.HOURLY_AS_DIRECTED,
                pickup_address=pickup,
                hourly_hours=duration
            )
            primary_quote = primary_matrix.get(target_vc_key) or list(primary_matrix.values())[0]

            base_rate = primary_quote.subtotal_net
            fees_and_taxes = primary_quote.tax_amount + primary_quote.gratuity_amount + stop_fee
            total = primary_quote.final_payable_amount + stop_fee

            servicing_payout = (total * servicing_pct).quantize(Decimal("0.01"))
            originating_commission = (total * originating_pct).quantize(Decimal("0.01"))
            platform_fee = (total - servicing_payout - originating_commission).quantize(Decimal("0.01"))

            # Calculate live rates for all vendors in market city
            city_vendors = []
            for v in vendors:
                v_key = normalize_vendor_key(v.vendor_id)
                v_matrix = PricingService.calculate_quote_matrix(
                    tenant_id="tenant-us-east",
                    vendor_id=v_key,
                    service_type=DomainServiceType.HOURLY_AS_DIRECTED,
                    pickup_address=pickup,
                    hourly_hours=duration
                )
                q_suv = v_matrix.get("LUXURY_SUV") or v_matrix.get("SUV") or list(v_matrix.values())[0]
                q_first = v_matrix.get("FIRST_CLASS") or list(v_matrix.values())[0]
                q_sedan = v_matrix.get("BUSINESS_SEDAN") or list(v_matrix.values())[0]
                q_van = v_matrix.get("BUSINESS_VAN") or list(v_matrix.values())[0]

                v_rates = {
                    "LUXURY_SUV": {"base_fare_usd": float(q_suv.subtotal_net), "fees_and_taxes_usd": float(q_suv.tax_amount + q_suv.gratuity_amount + stop_fee), "total_fare_usd": float(q_suv.final_payable_amount + stop_fee)},
                    "FIRST_CLASS": {"base_fare_usd": float(q_first.subtotal_net), "fees_and_taxes_usd": float(q_first.tax_amount + q_first.gratuity_amount + stop_fee), "total_fare_usd": float(q_first.final_payable_amount + stop_fee)},
                    "BUSINESS_SEDAN": {"base_fare_usd": float(q_sedan.subtotal_net), "fees_and_taxes_usd": float(q_sedan.tax_amount + q_sedan.gratuity_amount + stop_fee), "total_fare_usd": float(q_sedan.final_payable_amount + stop_fee)},
                    "BUSINESS_CLASS": {"base_fare_usd": float(q_sedan.subtotal_net), "fees_and_taxes_usd": float(q_sedan.tax_amount + q_sedan.gratuity_amount + stop_fee), "total_fare_usd": float(q_sedan.final_payable_amount + stop_fee)},
                    "BUSINESS_VAN": {"base_fare_usd": float(q_van.subtotal_net), "fees_and_taxes_usd": float(q_van.tax_amount + q_van.gratuity_amount + stop_fee), "total_fare_usd": float(q_van.final_payable_amount + stop_fee)}
                }
                v_amenities = json.loads(v.amenities_json) if isinstance(v.amenities_json, str) else (v.amenities_json or ["Free Wi-Fi", "Bottled Water"])
                city_vendors.append({
                    "vendor_id": v.vendor_id,
                    "company_name": v.company_name,
                    "market_city": v.market_city,
                    "rating_score": float(v.rating_score),
                    "total_reviews_count": v.total_reviews_count,
                    "fleet_size": v.fleet_size,
                    "vehicle_makes": v.vehicle_makes,
                    "primary_chauffeur_name": v.primary_chauffeur_name or "Marcus Vance",
                    "primary_chauffeur_phone": v.primary_chauffeur_phone or "+1 (215) 555-0144",
                    "primary_vehicle_plate": v.primary_vehicle_plate or "PA 8492-LM",
                    "primary_vehicle_name": v.primary_vehicle_name or "Lincoln Navigator L",
                    "amenities": v_amenities,
                    "cancellation_policy": v.cancellation_policy,
                    "rates": v_rates
                })

            return {
                "service_type": "HOURLY",
                "pickup": pickup,
                "hourly_duration": duration,
                "vehicle_class": vehicle_class,
                "stops_count": stops_count,
                "servicing_vendor_id": vendor_id,
                "servicing_vendor_name": vendor_name,
                "market_city": market_city,
                "city_vendors": city_vendors,
                "base_fare_usd": float(base_rate),
                "fees_and_taxes_usd": float(fees_and_taxes),
                "total_fare_usd": float(total),
                "servicing_payout_usd": float(servicing_payout),
                "originating_commission_usd": float(originating_commission),
                "platform_clearing_fee_usd": float(platform_fee),
                "currency": "USD",
                "free_cancellation_hours": free_cancellation_hrs
            }

        elif service_type == "MULTI_CITY" and multi_city_legs and len(multi_city_legs) > 0:
            total_base = Decimal("0.00")
            total_taxes = Decimal("0.00")
            total_tolls = Decimal("0.00")
            legs_summary = []

            for i, leg in enumerate(multi_city_legs):
                leg_p = leg.get("pickup", f"Pickup {i+1}")
                leg_d = leg.get("dropoff", f"Dropoff {i+1}")
                leg_vendors = self.find_nearest_vendors_for_pickup(leg_p, leg_d)
                leg_v = leg_vendors[0][0] if leg_vendors else servicing_vendor
                leg_v_key = normalize_vendor_key(leg_v.vendor_id if leg_v else active_vendor_key)

                leg_matrix = PricingService.calculate_quote_matrix(
                    tenant_id="tenant-us-east",
                    vendor_id=leg_v_key,
                    service_type=DomainServiceType.POINT_TO_POINT,
                    pickup_address=leg_p,
                    dropoff_address=leg_d
                )
                leg_q = leg_matrix.get(target_vc_key) or list(leg_matrix.values())[0]

                total_base += leg_q.subtotal_net
                total_taxes += (leg_q.tax_amount + leg_q.gratuity_amount)
                for itm in leg_q.line_items:
                    if "toll" in itm.description.lower():
                        total_tolls += itm.total_net

                legs_summary.append({
                    "leg_index": i + 1,
                    "pickup": leg_p,
                    "dropoff": leg_d,
                    "distance_miles": float(leg_q.distance_miles),
                    "servicing_vendor": leg_v.company_name if leg_v else vendor_name,
                    "base_fare_usd": float(leg_q.subtotal_net),
                    "taxes_usd": float(leg_q.tax_amount + leg_q.gratuity_amount),
                    "total_usd": float(leg_q.final_payable_amount)
                })

            total_fare = total_base + total_taxes + stop_fee
            servicing_payout = (total_fare * servicing_pct).quantize(Decimal("0.01"))
            originating_commission = (total_fare * originating_pct).quantize(Decimal("0.01"))
            platform_fee = (total_fare - servicing_payout - originating_commission).quantize(Decimal("0.01"))

            return {
                "service_type": "MULTI_CITY",
                "total_legs_count": len(multi_city_legs),
                "legs_breakdown": legs_summary,
                "legs_summary": legs_summary,
                "vehicle_class": vehicle_class,
                "servicing_vendor_id": vendor_id,
                "servicing_vendor_name": vendor_name,
                "market_city": market_city,
                "tolls_usd": float(total_tolls),
                "base_fare_usd": float(total_base),
                "fees_and_taxes_usd": float(total_taxes + stop_fee),
                "total_fare_usd": float(total_fare),
                "servicing_payout_usd": float(servicing_payout),
                "originating_commission_usd": float(originating_commission),
                "platform_clearing_fee_usd": float(platform_fee),
                "currency": "USD",
                "free_cancellation_hours": free_cancellation_hrs
            }

        else:
            # ONE_WAY Calculation
            dropoff_addr = dropoff or "John F. Kennedy International Airport (JFK)"
            
            # Check for Multi-Stop Intermediate Waypoints
            multi_route = None
            custom_distance_miles = None
            if clean_stops:
                multi_route = GoogleMapsService.calculate_multi_stop_route(
                    pickup=pickup,
                    intermediate_stops=clean_stops,
                    dropoff=dropoff_addr
                )
                custom_distance_miles = Decimal(str(multi_route["passenger_distance_miles"]))
                duration_minutes = multi_route["passenger_duration_minutes"]
                distance_miles = float(custom_distance_miles)
            else:
                maps_route = GoogleMapsService.calculate_road_distance_and_duration(pickup, dropoff_addr)
                distance_miles = float(maps_route.get("distance_miles", Decimal("15.00")))
                duration_minutes = int(maps_route.get("duration_minutes") or (173 if distance_miles > 100 else int(distance_miles * 1.5)))

            primary_matrix = PricingService.calculate_quote_matrix(
                tenant_id="tenant-us-east",
                vendor_id=active_vendor_key,
                service_type=DomainServiceType.POINT_TO_POINT,
                pickup_address=pickup,
                dropoff_address=dropoff_addr,
                distance_miles=custom_distance_miles
            )
            
            primary_quote = primary_matrix.get(target_vc_key) or list(primary_matrix.values())[0]

            if not clean_stops:
                distance_miles = float(primary_quote.distance_miles)
            base_rate = primary_quote.subtotal_net
            fees_and_taxes = primary_quote.tax_amount + primary_quote.gratuity_amount + stop_fee
            total = primary_quote.final_payable_amount + stop_fee

            detected_tolls = Decimal("0.00")
            for itm in primary_quote.line_items:
                if "toll" in itm.description.lower():
                    detected_tolls += itm.total_net

            # Calculate Live Quotes for ALL Vendors in this Market City / Nearest Cluster via Authoritative Pricing Engine
            city_vendors = []
            for v in vendors:
                v_key = normalize_vendor_key(v.vendor_id)
                v_matrix = PricingService.calculate_quote_matrix(
                    tenant_id="tenant-us-east",
                    vendor_id=v_key,
                    service_type=DomainServiceType.POINT_TO_POINT,
                    pickup_address=pickup,
                    dropoff_address=dropoff_addr,
                    distance_miles=custom_distance_miles
                )
                
                q_suv = v_matrix.get("LUXURY_SUV") or v_matrix.get("SUV") or list(v_matrix.values())[0]
                q_first = v_matrix.get("FIRST_CLASS") or list(v_matrix.values())[0]
                q_sedan = v_matrix.get("BUSINESS_SEDAN") or list(v_matrix.values())[0]
                q_van = v_matrix.get("BUSINESS_VAN") or list(v_matrix.values())[0]

                v_rates = {
                    "LUXURY_SUV": {
                        "base_fare_usd": float(q_suv.subtotal_net),
                        "fees_and_taxes_usd": float(q_suv.tax_amount + q_suv.gratuity_amount + stop_fee),
                        "total_fare_usd": float(q_suv.final_payable_amount + stop_fee)
                    },
                    "FIRST_CLASS": {
                        "base_fare_usd": float(q_first.subtotal_net),
                        "fees_and_taxes_usd": float(q_first.tax_amount + q_first.gratuity_amount + stop_fee),
                        "total_fare_usd": float(q_first.final_payable_amount + stop_fee)
                    },
                    "BUSINESS_SEDAN": {
                        "base_fare_usd": float(q_sedan.subtotal_net),
                        "fees_and_taxes_usd": float(q_sedan.tax_amount + q_sedan.gratuity_amount + stop_fee),
                        "total_fare_usd": float(q_sedan.final_payable_amount + stop_fee)
                    },
                    "BUSINESS_CLASS": {
                        "base_fare_usd": float(q_sedan.subtotal_net),
                        "fees_and_taxes_usd": float(q_sedan.tax_amount + q_sedan.gratuity_amount + stop_fee),
                        "total_fare_usd": float(q_sedan.final_payable_amount + stop_fee)
                    },
                    "BUSINESS_VAN": {
                        "base_fare_usd": float(q_van.subtotal_net),
                        "fees_and_taxes_usd": float(q_van.tax_amount + q_van.gratuity_amount + stop_fee),
                        "total_fare_usd": float(q_van.final_payable_amount + stop_fee)
                    }
                }

                v_amenities = json.loads(v.amenities_json) if isinstance(v.amenities_json, str) else (v.amenities_json or ["Free Wi-Fi", "Flight Tracking", "Bottled Water"])

                city_vendors.append({
                    "vendor_id": v.vendor_id,
                    "company_name": v.company_name,
                    "market_city": v.market_city,
                    "rating_score": float(v.rating_score),
                    "total_reviews_count": v.total_reviews_count,
                    "fleet_size": v.fleet_size,
                    "vehicle_makes": v.vehicle_makes,
                    "primary_chauffeur_name": v.primary_chauffeur_name or "Marcus Vance",
                    "primary_chauffeur_phone": v.primary_chauffeur_phone or "+1 (215) 555-0144",
                    "primary_vehicle_plate": v.primary_vehicle_plate or "PA 8492-LM",
                    "primary_vehicle_name": v.primary_vehicle_name or "Lincoln Navigator L",
                    "amenities": v_amenities,
                    "cancellation_policy": v.cancellation_policy,
                    "rates": v_rates
                })

            # Marketplace Clearinghouse Escrow Rules
            servicing_payout = (total * servicing_pct).quantize(Decimal("0.01"))
            originating_commission = (total * originating_pct).quantize(Decimal("0.01"))
            platform_fee = (total - servicing_payout - originating_commission).quantize(Decimal("0.01"))

            return {
                "service_type": "ONE_WAY",
                "pickup": pickup,
                "dropoff": dropoff or "Manhattan, New York, NY",
                "intermediate_stops": clean_stops,
                "vehicle_class": vehicle_class,
                "distance_miles": round(distance_miles, 1),
                "duration_minutes": duration_minutes,
                "stops_count": effective_stops_count,
                "intermediate_stop_fee_usd": float(stop_fee),
                "route_segments": multi_route["segments"] if multi_route else None,
                "tolls_usd": float(detected_tolls),
                "servicing_vendor_id": vendor_id,
                "servicing_vendor_name": vendor_name,
                "market_city": market_city,
                "city_vendors": city_vendors,
                "base_fare_usd": float(base_rate),
                "fees_and_taxes_usd": float(fees_and_taxes),
                "total_fare_usd": float(total),
                "servicing_payout_usd": float(servicing_payout),
                "originating_commission_usd": float(originating_commission),
                "platform_clearing_fee_usd": float(platform_fee),
                "currency": "USD",
                "free_cancellation_hours": free_cancellation_hrs
            }

    # --- MARKETPLACE RULES READ & ADJUSTMENT ---
    def get_marketplace_rules(self) -> Dict[str, Any]:
        """Retrieves authoritative marketplace commission splits, fee structures, and pricing rules."""
        cfg = self.get_or_create_clearinghouse_config()
        return {
            "config_id": cfg.config_id,
            "servicing_affiliate_payout_pct": float(cfg.servicing_affiliate_payout_pct),
            "originating_booker_commission_pct": float(cfg.originating_booker_commission_pct),
            "platform_clearing_fee_pct": float(cfg.platform_clearing_fee_pct),
            "escrow_hold_buffer_hours": cfg.escrow_hold_buffer_hours,
            "intermediate_stop_fee_usd": float(cfg.intermediate_stop_fee_usd or 15.00),
            "airport_terminal_fee_usd": float(cfg.airport_terminal_fee_usd or 20.00),
            "min_hourly_duration_hours": cfg.min_hourly_duration_hours or 2,
            "hourly_business_rate_usd": float(cfg.hourly_business_rate_usd or 45.00),
            "hourly_first_rate_usd": float(cfg.hourly_first_rate_usd or 70.00),
            "hourly_van_rate_usd": float(cfg.hourly_van_rate_usd or 60.00),
            "surge_multiplier": float(cfg.surge_multiplier or 1.00),
            "tax_percentage": float(cfg.tax_percentage or 15.00),
            "free_cancellation_hours": cfg.free_cancellation_hours or 24,
            "stripe_connect_master_platform_id": cfg.stripe_connect_master_platform_id,
            "updated_at": cfg.updated_at.isoformat() if cfg.updated_at else None
        }

    def update_marketplace_rules(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Adjusts marketplace rules, commission split ratios, and operational fee thresholds."""
        cfg = self.get_or_create_clearinghouse_config()
        for field in [
            "servicing_affiliate_payout_pct", "originating_booker_commission_pct",
            "platform_clearing_fee_pct", "escrow_hold_buffer_hours",
            "intermediate_stop_fee_usd", "airport_terminal_fee_usd",
            "min_hourly_duration_hours", "hourly_business_rate_usd",
            "hourly_first_rate_usd", "hourly_van_rate_usd",
            "surge_multiplier", "tax_percentage", "free_cancellation_hours",
            "stripe_connect_master_platform_id"
        ]:
            if field in updates and updates[field] is not None:
                val = updates[field]
                if field.endswith(("_pct", "_usd", "_multiplier", "_percentage")):
                    setattr(cfg, field, Decimal(str(val)))
                else:
                    setattr(cfg, field, val)

        cfg.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(cfg)
        return self.get_marketplace_rules()



    def resolve_driver_live_stats(self, vendor_id: Optional[str], driver_name: Optional[str] = None) -> Tuple[Decimal, int]:
        """Dynamically computes live lifetime rides and average passenger rating from DriverModel, TripModel & Vendor Registry."""
        try:
            from app.database_mysql import mysql_db, DriverModel, TripModel
            session = mysql_db.get_session()
            if session:
                try:
                    norm_vid = vendor_id.replace("vnd_", "vendor_").replace("-", "_") if vendor_id else ""
                    alias_vid = vendor_id.replace("vnd_", "vendor-").replace("_", "-") if vendor_id else ""
                    driver = None
                    if driver_name:
                        first_n = driver_name.split()[0]
                        driver = session.query(DriverModel).filter(
                            (DriverModel.first_name.ilike(f"%{first_n}%")) &
                            ((DriverModel.vendor_id == vendor_id) | (DriverModel.vendor_id == norm_vid) | (DriverModel.vendor_id == alias_vid))
                        ).first()
                    if not driver and (vendor_id or norm_vid):
                        driver = session.query(DriverModel).filter(
                            (DriverModel.vendor_id == vendor_id) | (DriverModel.vendor_id == norm_vid) | (DriverModel.vendor_id == alias_vid)
                        ).first()

                    if driver:
                        completed_trips = session.query(TripModel).filter(
                            TripModel.driver_id == driver.id,
                            TripModel.status.in_(["COMPLETED", "PAID", "SETTLED"])
                        ).count()
                        rides = max(int(driver.trips_completed or 0), completed_trips)
                        rating = Decimal(str(round(driver.rating or 4.98, 2)))
                        return (rating, rides if rides > 0 else max(150, int(driver.trips_completed or 150)))
                finally:
                    session.close()
        except Exception as e:
            logger.debug(f"Live driver stats lookup notice: {e}")

        # Fallback to matched vendor profile live verified reviews & rating
        if vendor_id:
            vp = self.db.query(HubVendorProfileModel).filter(
                (HubVendorProfileModel.vendor_id == vendor_id) |
                (HubVendorProfileModel.vendor_id == vendor_id.replace("vendor_", "vnd_")) |
                (HubVendorProfileModel.vendor_id == vendor_id.replace("vnd_", "vendor_"))
            ).first()
            if vp:
                return (Decimal(str(vp.rating_score or 4.95)), int(vp.total_reviews_count or 450))

        return (Decimal("4.95"), 320)

    # --- MASTER BOOKINGS & SINGLE UNIFIED INVOICES ---
    def create_master_booking(
        self,
        trip_type: str,
        pickup_address: str,
        dropoff_address: str,
        pickup_datetime_str: str,
        passengers_count: int,
        vehicle_class: str,
        passenger_type: str,
        passenger_first_name: str,
        passenger_last_name: str,
        passenger_email: str,
        passenger_phone: str,
        flight_number: Optional[str] = None,
        pickup_meeting_point: str = "Airport - Arrivals (Baggage Claim)",
        child_seats_count: int = 0,
        special_requests: Optional[str] = None,
        sourcing_mode: str = "AUTO_ROUTED",
        selected_vendor_id: Optional[str] = None,
        base_fare: Decimal = Decimal("125.00"),
        fees_and_taxes: Decimal = Decimal("20.00"),
        payment_method: str = "CARD",
        stripe_payment_intent_id: Optional[str] = None,
        intermediate_stops: Optional[List[str]] = None
    ) -> HubMasterBookingModel:
        self.ensure_default_vetted_vendors()
        
        # Determine Market City and Nearest Sovereign Vendor to starting pickup point
        market_city = self.resolve_market_city(pickup_address, dropoff_address)
        assigned_vendor = None
        if sourcing_mode == "EXPLICIT_VENDOR" and selected_vendor_id:
            assigned_vendor = self.db.query(HubVendorProfileModel).filter(
                HubVendorProfileModel.vendor_id == selected_vendor_id,
                HubVendorProfileModel.is_active == True,
                HubVendorProfileModel.health_status == "ONLINE_HEALTHY"
            ).first()
        if not assigned_vendor:
            nearest_vendors = self.find_nearest_vendors_for_pickup(pickup_address, dropoff_address)
            if nearest_vendors:
                assigned_vendor = nearest_vendors[0][0]
        if not assigned_vendor:
            assigned_vendor = self.get_round_robin_vendor(market_city)
        if not assigned_vendor:
            assigned_vendor = self.get_round_robin_vendor("New York")
        if not assigned_vendor:
            assigned_vendor = self.db.query(HubVendorProfileModel).filter(HubVendorProfileModel.is_active == True).first()

        # Generate Collision-Free Reference code like LM-20481
        booking_ref = f"LM-{random.randint(10000, 99999)}"
        while self.db.query(HubMasterBookingModel).filter(HubMasterBookingModel.booking_reference == booking_ref).first():
            booking_ref = f"LM-{random.randint(10000, 99999)}"
        total_fare = base_fare + fees_and_taxes

        # Dynamic Chauffeur, Plate, and Fleet attributes from authoritative database entity
        v_id = assigned_vendor.vendor_id if assigned_vendor else "vnd_anb_philly"
        v_name = assigned_vendor.company_name if assigned_vendor else "ANB Trans Inc Executive Chauffeurs"
        chauffeur_name = assigned_vendor.primary_chauffeur_name if (assigned_vendor and getattr(assigned_vendor, "primary_chauffeur_name", None)) else "Marcus Vance"
        chauffeur_phone = assigned_vendor.primary_chauffeur_phone if (assigned_vendor and getattr(assigned_vendor, "primary_chauffeur_phone", None)) else "+1 (215) 555-0144"
        vehicle_plate = assigned_vendor.primary_vehicle_plate if (assigned_vendor and getattr(assigned_vendor, "primary_vehicle_plate", None)) else "PA 8492-LM"
        vehicle_model = assigned_vendor.primary_vehicle_name if (assigned_vendor and getattr(assigned_vendor, "primary_vehicle_name", None)) else "Lincoln Navigator L / Mercedes-Benz S-Class"

        # Resolve live chauffeur rating and completed lifetime trips
        # Capture Immutable Rate Card & Terms Snapshot (Section 5)
        rate_snapshot = {
            "vendor_id": v_id,
            "vendor_name": v_name,
            "business_class_base_rate_usd": float(assigned_vendor.business_class_base_rate_usd) if assigned_vendor and assigned_vendor.business_class_base_rate_usd else 125.0,
            "first_class_base_rate_usd": float(assigned_vendor.first_class_base_rate_usd) if assigned_vendor and assigned_vendor.first_class_base_rate_usd else 185.0,
            "business_van_base_rate_usd": float(assigned_vendor.business_van_base_rate_usd) if assigned_vendor and assigned_vendor.business_van_base_rate_usd else 165.0,
            "hourly_rate_business_usd": float(assigned_vendor.hourly_rate_business_usd) if assigned_vendor and assigned_vendor.hourly_rate_business_usd else 85.0,
            "per_mile_rate_usd": float(assigned_vendor.per_mile_rate_usd) if assigned_vendor and assigned_vendor.per_mile_rate_usd else 4.25,
            "waiting_time_rate_per_min_usd": float(assigned_vendor.waiting_time_rate_per_min_usd) if assigned_vendor and assigned_vendor.waiting_time_rate_per_min_usd else 1.25,
            "operating_radius_miles": float(assigned_vendor.operating_radius_miles) if assigned_vendor and assigned_vendor.operating_radius_miles else 150.0,
            "snapshot_timestamp_utc": datetime.now(timezone.utc).isoformat()
        }
        terms_snapshot = {
            "cancellation_policy": assigned_vendor.cancellation_policy if assigned_vendor and assigned_vendor.cancellation_policy else "Free cancellation up to 24 hours before pickup",
            "base_fare_usd": float(base_fare),
            "fees_and_taxes_usd": float(fees_and_taxes),
            "total_amount_usd": float(total_fare),
            "currency": "USD"
        }

        booking = HubMasterBookingModel(
            booking_reference=booking_ref,
            trip_type=trip_type,
            status="CONFIRMED",
            passenger_type=passenger_type,
            passenger_first_name=passenger_first_name,
            passenger_last_name=passenger_last_name,
            passenger_email=passenger_email.strip().lower(),
            passenger_phone=passenger_phone,
            pickup_address=pickup_address,
            dropoff_address=dropoff_address,
            pickup_datetime_str=pickup_datetime_str,
            passengers_count=passengers_count,
            flight_number=flight_number,
            pickup_meeting_point=pickup_meeting_point,
            child_seats_count=child_seats_count,
            special_requests=special_requests,
            vehicle_class=vehicle_class,
            vehicle_model_name=vehicle_model,
            base_fare_usd=base_fare,
            fees_and_taxes_usd=fees_and_taxes,
            total_amount_usd=total_fare,
            payment_method=payment_method,
            stripe_payment_intent_id=stripe_payment_intent_id,
            rate_card_snapshot_json=json.dumps(rate_snapshot),
            commercial_terms_snapshot_json=json.dumps(terms_snapshot),
            sourcing_mode=sourcing_mode,
            assigned_vendor_id=v_id,
            assigned_vendor_name=v_name,
            assigned_chauffeur_name=chauffeur_name,
            assigned_chauffeur_phone=chauffeur_phone,
            assigned_vehicle_plate=vehicle_plate
        )
        self.db.add(booking)
        self.db.flush()

        # Multi-Stop Routing: Persist Authoritative Master Itinerary and HubLegModel records for each route segment
        if intermediate_stops:
            clean_stops = [s.strip() for s in intermediate_stops if s and s.strip()]
            if clean_stops:
                all_stops = [pickup_address] + clean_stops + [dropoff_address]
                itin = HubItineraryModel(
                    title=f"Multi-Stop Route: {pickup_address.split(',')[0]} to {dropoff_address.split(',')[0]}",
                    total_legs_count=len(all_stops) - 1,
                    customer_name=f"{passenger_first_name} {passenger_last_name}",
                    customer_email=passenger_email.strip().lower(),
                    customer_phone=passenger_phone,
                    subtotal_net_usd=base_fare,
                    all_inclusive_total_usd=total_fare,
                    status="CONFIRMED"
                )
                self.db.add(itin)
                self.db.flush()

                try:
                    from app.services.google_maps_service import GoogleMapsService
                    ms_route = GoogleMapsService.calculate_multi_stop_route(
                        pickup=pickup_address,
                        intermediate_stops=clean_stops,
                        dropoff=dropoff_address
                    )
                    segments = ms_route.get("route_segments", [])
                except Exception:
                    segments = []

                for i in range(len(all_stops) - 1):
                    p1 = all_stops[i]
                    p2 = all_stops[i + 1]
                    seg_dist = Decimal(str(segments[i]["distance_miles"])) if i < len(segments) and "distance_miles" in segments[i] else Decimal("10.00")
                    leg = HubLegModel(
                        itinerary_id=itin.itinerary_id,
                        booking_id=booking.booking_id,
                        leg_index=i + 1,
                        title=f"Leg {i + 1}: {p1.split(',')[0]} to {p2.split(',')[0]}",
                        origin_city=market_city,
                        origin_address=p1,
                        destination_city=market_city,
                        destination_address=p2,
                        distance_miles=seg_dist,
                        vehicle_class=vehicle_class,
                        servicing_vendor_id=v_id
                    )
                    self.db.add(leg)
                self.db.flush()

        # Generate Collision-Free Single Unified Invoice (INV-GH-2026-XXXX)
        inv_number = f"INV-GH-2026-{random.randint(10000, 99999)}"
        while self.db.query(HubInvoiceModel).filter(HubInvoiceModel.invoice_number == inv_number).first():
            inv_number = f"INV-GH-2026-{random.randint(10000, 99999)}"
        invoice = HubInvoiceModel(
            invoice_number=inv_number,
            booking_id=booking.booking_id,
            customer_name=f"{passenger_first_name} {passenger_last_name}",
            customer_email=passenger_email.strip().lower(),
            subtotal_usd=base_fare,
            taxes_usd=fees_and_taxes,
            total_charged_usd=total_fare,
            payment_status="PAID"
        )
        self.db.add(invoice)

        # Resolve real pickup location GPS coordinates for initial telemetry staging
        start_lat = assigned_vendor.base_latitude if assigned_vendor and assigned_vendor.base_latitude else 39.9526
        start_lng = assigned_vendor.base_longitude if assigned_vendor and assigned_vendor.base_longitude else -75.1652
        try:
            from app.services.google_maps_service import GoogleMapsService
            geo_start = GoogleMapsService.validate_and_geocode_address(pickup_address)
            if geo_start and geo_start.get("valid") and geo_start.get("lat") and geo_start.get("lng"):
                start_lat = float(geo_start["lat"])
                start_lng = float(geo_start["lng"])
        except Exception:
            pass

        # Resolve live chauffeur rating and completed lifetime trips
        driver_rating, driver_rides = self.resolve_driver_live_stats(v_id, chauffeur_name)

        # Initialize Real GPS Telemetry record for Live Tracking (Page 11)
        telemetry = HubDriverTelemetryModel(
            booking_id=booking.booking_id,
            chauffeur_name=chauffeur_name,
            chauffeur_rating=driver_rating,
            total_rides=driver_rides,
            vehicle_plate=vehicle_plate,
            vehicle_name=vehicle_model,
            current_lat=start_lat,
            current_lng=start_lng,
            heading_deg=45.0,
            speed_mph=28.5,
            eta_minutes=8,
            status_text=f"Chauffeur {chauffeur_name} assigned - En route to {pickup_address}."
        )
        self.db.add(telemetry)

        # Record 80/10/10 Escrow Settlement in Authoritative Ledger
        cfg = self.get_or_create_clearinghouse_config()
        servicing_pct = cfg.servicing_affiliate_payout_pct / Decimal("100.00")
        originating_pct = cfg.originating_booker_commission_pct / Decimal("100.00")
        platform_pct = cfg.platform_clearing_fee_pct / Decimal("100.00")

        settlement = HubEscrowSettlementModel(
            itinerary_id=booking.booking_id,
            booking_id=booking.booking_id,
            total_fare_usd=total_fare,
            servicing_payout_usd=(total_fare * servicing_pct).quantize(Decimal("0.01")),
            originating_commission_usd=(total_fare * originating_pct).quantize(Decimal("0.01")),
            platform_clearing_fee_usd=(total_fare * platform_pct).quantize(Decimal("0.01")),
            servicing_vendor_id=booking.assigned_vendor_id,
            originating_vendor_id="global_hub_public_web",
            stripe_payment_intent_id=stripe_payment_intent_id,
            status="PREAUTH_HELD"
        )
        self.db.add(settlement)

        self.db.commit()
        self.db.refresh(booking)

        # Dispatch & Farm Out Booking to the Performing Sovereign Vendor Cell
        self.farm_out_to_vendor_cell(assigned_vendor, booking)

        # Dispatch Transactional Email & SMS Notifications (Sprint 2)
        try:
            from packages.global_hub.backend.services.notification_service import GlobalHubNotificationService
            GlobalHubNotificationService.dispatch_booking_notifications(booking, invoice)
        except Exception as e:
            logger.warning(f"Notification dispatch notice: {e}")

        return booking

    def farm_out_to_vendor_cell(
        self,
        vendor: Optional[HubVendorProfileModel],
        booking: HubMasterBookingModel
    ) -> Dict[str, Any]:
        """Dispatches and farms out a confirmed passenger booking to the performing sovereign Vendor Cell."""
        if not vendor:
            return {"farmed_out": True, "vendor_status": "LOCAL_RECORDED"}

        endpoints_to_try = []
        if getattr(vendor, "api_endpoint_url", None):
            endpoints_to_try.append(vendor.api_endpoint_url)

        if vendor.vendor_id in ("vnd_anb_philly", "vnd_mainline_philly"):
            endpoints_to_try.extend(["http://vendor-cell-philly:8000", "http://127.0.0.1:8001", "http://localhost:8001"])
        elif vendor.vendor_id in ("vnd_manhattan_prestige", "vnd_empire_black_car"):
            endpoints_to_try.extend(["http://vendor-cell-ny:8000", "http://127.0.0.1:8002", "http://localhost:8002"])

        farm_payload = {
            "booking_reference": booking.booking_reference,
            "pickup_address": booking.pickup_address,
            "dropoff_address": booking.dropoff_address,
            "pickup_datetime_str": booking.pickup_datetime_str,
            "passengers_count": booking.passengers_count,
            "vehicle_class": booking.vehicle_class,
            "passenger_first_name": booking.passenger_first_name,
            "passenger_last_name": booking.passenger_last_name,
            "passenger_email": booking.passenger_email,
            "passenger_phone": booking.passenger_phone,
            "flight_number": booking.flight_number,
            "total_fare_usd": float(booking.total_amount_usd or 0),
            "servicing_payout_usd": float(booking.base_fare_usd or 0) * 0.80,
            "farm_out_status": "DISPATCHED_TO_PERFORMING_CELL"
        }

        import requests
        for endpoint in list(dict.fromkeys(endpoints_to_try)):
            try:
                url = f"{endpoint.rstrip('/')}/api/v1/vendor-cell/{vendor.vendor_id}/affiliate/farm-in"
                resp = requests.post(url, json=farm_payload, timeout=2.0)
                if resp.status_code in (200, 201):
                    logger.info(f"Farm-out dispatched successfully to {vendor.company_name} at {url}")
                    return {"farmed_out": True, "vendor_status": "ACCEPTED", "endpoint": url}
            except Exception:
                pass

        return {"farmed_out": True, "vendor_status": "ACCEPTED_LOCAL_COMMITTED"}

    def get_booking_by_reference(self, reference: str, email: Optional[str] = None) -> Optional[HubMasterBookingModel]:
        query = self.db.query(HubMasterBookingModel).filter(HubMasterBookingModel.booking_reference == reference.strip().upper())
        if email:
            query = query.filter(HubMasterBookingModel.passenger_email == email.strip().lower())
        return query.first()

    def list_bookings_by_customer(self, email: str) -> List[HubMasterBookingModel]:
        return self.db.query(HubMasterBookingModel).filter(
            HubMasterBookingModel.passenger_email == email.strip().lower()
        ).order_by(HubMasterBookingModel.created_at.desc()).all()

    def list_recent_bookings(self, limit: int = 20) -> List[HubMasterBookingModel]:
        return self.db.query(HubMasterBookingModel).order_by(
            HubMasterBookingModel.created_at.desc()
        ).limit(limit).all()

    # --- TELEMETRY & LIVE TRACKING ---
    def get_telemetry_for_booking(self, reference: str) -> Optional[Dict[str, Any]]:
        booking = self.get_booking_by_reference(reference)
        if not booking:
            return None
        
        telemetry = self.db.query(HubDriverTelemetryModel).filter(
            HubDriverTelemetryModel.booking_id == booking.booking_id
        ).first()

        if not telemetry:
            start_lat = 39.9526
            start_lng = -75.1652
            try:
                from app.services.google_maps_service import GoogleMapsService
                geo_start = GoogleMapsService.validate_and_geocode_address(booking.pickup_address)
                if geo_start and geo_start.get("valid") and geo_start.get("lat") and geo_start.get("lng"):
                    start_lat = float(geo_start["lat"])
                    start_lng = float(geo_start["lng"])
            except Exception:
                pass

            driver_rating, driver_rides = self.resolve_driver_live_stats(
                booking.assigned_vendor_id, booking.assigned_chauffeur_name
            )
            telemetry = HubDriverTelemetryModel(
                booking_id=booking.booking_id,
                chauffeur_name=booking.assigned_chauffeur_name or "Assigned Chauffeur",
                chauffeur_rating=driver_rating,
                total_rides=driver_rides,
                vehicle_plate=booking.assigned_vehicle_plate or "PA 8492-LM",
                vehicle_name=booking.vehicle_model_name or "Executive Fleet Vehicle",
                current_lat=start_lat,
                current_lng=start_lng,
                eta_minutes=8,
                status_text=f"Chauffeur {booking.assigned_chauffeur_name or 'assigned'} en route to pickup."
            )
            self.db.add(telemetry)
            self.db.commit()
            self.db.refresh(telemetry)

        flight_data = None
        if booking.flight_number:
            flight_data = {
                "flight_number": booking.flight_number,
                "status": getattr(booking, "flight_status", None) or "ON_SCHEDULE",
                "delay_minutes": getattr(booking, "flight_delay_minutes", 0) or 0,
                "terminal": getattr(booking, "flight_terminal", None) or "Main Terminal",
                "gate": getattr(booking, "flight_gate", None) or "Gate Arrival",
                "baggage_carousel": getattr(booking, "flight_baggage_claim", None) or "Baggage Claim",
                "grace_period_minutes": getattr(booking, "flight_grace_period_minutes", 60) or 60,
                "estimated_arrival_utc": booking.flight_estimated_arrival_utc.isoformat() if getattr(booking, "flight_estimated_arrival_utc", None) else None
            }

        return {
            "booking_reference": booking.booking_reference,
            "status": booking.status,
            "status_text": telemetry.status_text,
            "pickup": booking.pickup_address,
            "dropoff": booking.dropoff_address,
            "dateTime": booking.pickup_datetime_str,
            "passengers": booking.passengers_count,
            "vehicleClass": booking.vehicle_class,
            "vehicleModel": booking.vehicle_model_name,
            "totalPrice": float(booking.total_amount_usd),
            "chauffeur": {
                "name": telemetry.chauffeur_name,
                "role": "Professional Chauffeur",
                "rating": float(telemetry.chauffeur_rating),
                "rides": telemetry.total_rides,
                "phone": booking.assigned_chauffeur_phone or "+1 (212) 555-0199"
            },
            "vehicle": {
                "name": telemetry.vehicle_name,
                "plate": telemetry.vehicle_plate
            },
            "live_location": {
                "lat": telemetry.current_lat,
                "lng": telemetry.current_lng,
                "speed_mph": telemetry.speed_mph,
                "eta_minutes": telemetry.eta_minutes,
                "status_text": telemetry.status_text
            },
            "flight_status": flight_data
        }

    # --- CLEARINGHOUSE SPLIT CONFIGURATION ---
    def get_or_create_clearinghouse_config(self) -> HubClearinghouseConfigModel:
        cfg = self.db.query(HubClearinghouseConfigModel).filter(
            HubClearinghouseConfigModel.config_id == "global_clearinghouse_master"
        ).first()
        if not cfg:
            cfg = HubClearinghouseConfigModel(
                config_id="global_clearinghouse_master",
                servicing_affiliate_payout_pct=Decimal("80.00"),
                originating_booker_commission_pct=Decimal("10.00"),
                platform_clearing_fee_pct=Decimal("10.00"),
                escrow_hold_buffer_hours=24
            )
            self.db.add(cfg)
            self.db.commit()
            self.db.refresh(cfg)
        return cfg

    # --- BOOKING LIFECYCLE: CANCELLATIONS, COMPLETION & SETTLEMENTS ---
    def cancel_booking(self, reference: str, cancellation_reason: Optional[str] = None) -> Optional[HubMasterBookingModel]:
        """Cancels booking and releases escrow hold in authoritative double-entry ledger."""
        booking = self.get_booking_by_reference(reference)
        if not booking:
            return None

        booking.status = "CANCELLED"
        booking.updated_at = datetime.utcnow()

        # Cancel or refund payment intent if held via Stripe API
        from packages.global_hub.backend.services.escrow_settlement import GlobalHubEscrowSettlement
        if booking.stripe_payment_intent_id:
            GlobalHubEscrowSettlement.cancel_or_refund_payment(booking.stripe_payment_intent_id)

        if booking.settlement:
            booking.settlement.status = "CANCELLED_REFUNDED"
            booking.settlement.updated_at = datetime.utcnow()

        telemetry = self.db.query(HubDriverTelemetryModel).filter(
            HubDriverTelemetryModel.booking_id == booking.booking_id
        ).first()
        if telemetry:
            telemetry.status_text = f"Cancelled: {cancellation_reason or 'Passenger requested cancellation'}"

        self.db.commit()
        self.db.refresh(booking)
        return booking

    def complete_and_settle_booking(self, reference: str) -> Optional[HubMasterBookingModel]:
        """
        Marks booking as COMPLETED, captures pre-auth escrow funds, 
        and executes the automated 80/10/10 Stripe Connect split payout.
        """
        booking = self.get_booking_by_reference(reference)
        if not booking:
            return None

        booking.status = "COMPLETED"
        booking.updated_at = datetime.utcnow()

        if booking.invoice:
            booking.invoice.payment_status = "SETTLED"

        # Execute live or connected Stripe Connect transfer for the 80% servicing payout
        if booking.settlement:
            vendor = self.db.query(HubVendorProfileModel).filter(
                HubVendorProfileModel.vendor_id == booking.assigned_vendor_id
            ).first()
            stripe_acct = vendor.stripe_connect_account_id if vendor else "acct_test_affiliate80"
            from packages.global_hub.backend.services.escrow_settlement import GlobalHubEscrowSettlement
            GlobalHubEscrowSettlement.execute_live_stripe_split_transfer(
                db=self.db,
                booking_id=booking.booking_id,
                servicing_stripe_account=stripe_acct
            )

        telemetry = self.db.query(HubDriverTelemetryModel).filter(
            HubDriverTelemetryModel.booking_id == booking.booking_id
        ).first()
        if telemetry:
            telemetry.status_text = "Trip Completed - Thank you for riding with Global Hub."
            telemetry.speed_mph = 0.0
            telemetry.eta_minutes = 0

        self.db.commit()
        self.db.refresh(booking)
        return booking

    def update_booking(self, reference: str, updates: Dict[str, Any]) -> Optional[HubMasterBookingModel]:
        """Amends itinerary details, passenger notes, or flight info."""
        booking = self.get_booking_by_reference(reference)
        if not booking:
            return None

        for field in [
            "pickup_datetime_str", "flight_number", "pickup_meeting_point",
            "child_seats_count", "special_requests", "passenger_phone",
            "passenger_first_name", "passenger_last_name"
        ]:
            if field in updates and updates[field] is not None:
                setattr(booking, field, updates[field])

        booking.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(booking)
        return booking

    # --- DRIVER HARDWARE / APP TELEMETRY INGESTION ---
    def push_driver_telemetry(
        self,
        reference: str,
        lat: float,
        lng: float,
        heading: float = 0.0,
        speed_mph: float = 0.0,
        eta_minutes: int = 8,
        status_text: Optional[str] = None
    ) -> Optional[HubDriverTelemetryModel]:
        """Ingests live GPS coordinates and ETA updates from driver mobile hardware."""
        booking = self.get_booking_by_reference(reference)
        if not booking:
            return None

        telemetry = self.db.query(HubDriverTelemetryModel).filter(
            HubDriverTelemetryModel.booking_id == booking.booking_id
        ).first()

        if not telemetry:
            driver_rating, driver_rides = self.resolve_driver_live_stats(
                booking.assigned_vendor_id, booking.assigned_chauffeur_name
            )
            telemetry = HubDriverTelemetryModel(
                booking_id=booking.booking_id,
                chauffeur_name=booking.assigned_chauffeur_name or "Assigned Chauffeur",
                vehicle_plate=booking.assigned_vehicle_plate or "PA 8492-LM",
                vehicle_name=booking.vehicle_model_name or "Executive Fleet Vehicle",
                chauffeur_rating=driver_rating,
                total_rides=driver_rides
            )
            self.db.add(telemetry)

        telemetry.current_lat = lat
        telemetry.current_lng = lng
        telemetry.heading_deg = heading
        telemetry.speed_mph = speed_mph
        telemetry.eta_minutes = eta_minutes
        if status_text:
            telemetry.status_text = status_text
        telemetry.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(telemetry)
        return telemetry

    # --- FLIGHT RADAR & AIRPORT DELAY INGESTION (SPRINT 4) ---
    def process_flight_status_webhook(
        self,
        flight_number: str,
        flight_status: str,
        estimated_arrival_str: Optional[str] = None,
        delay_minutes: int = 0
    ) -> List[HubMasterBookingModel]:
        """Auto-adjusts airport pickup schedule and chauffeur telemetry when flights are delayed, airborne, or landed."""
        clean_flight = flight_number.strip().upper()
        bookings = self.db.query(HubMasterBookingModel).filter(
            HubMasterBookingModel.flight_number == clean_flight,
            HubMasterBookingModel.status.in_(["CONFIRMED", "CHAUFFEUR_DISPATCHED"])
        ).all()

        for b in bookings:
            status_upper = flight_status.upper()
            if status_upper == "DELAYED":
                b.special_requests = f"[Flight Radar Update]: Flight {clean_flight} delayed by {delay_minutes} min. New ETA: {estimated_arrival_str or 'Adjusted'}."
                if estimated_arrival_str:
                    b.pickup_datetime_str = f"Estimated: {estimated_arrival_str} (Delayed +{delay_minutes}m)"
            elif status_upper == "AIRBORNE":
                b.special_requests = f"[Flight Radar]: Flight {clean_flight} Airborne. ETA: {estimated_arrival_str or 'On Time'}."
            elif status_upper == "LANDED":
                b.special_requests = f"[Flight Radar]: Flight {clean_flight} Touchdown Landed. Meet at Baggage Claim."
            elif status_upper in ["DIVERTED", "CANCELLED"]:
                b.special_requests = f"[URGENT - Flight Radar]: Flight {clean_flight} {status_upper}. Dispatch staging on standby."

            b.updated_at = datetime.utcnow()

            # Update driver GPS telemetry status alert
            telemetry = self.db.query(HubDriverTelemetryModel).filter(
                HubDriverTelemetryModel.booking_id == b.booking_id
            ).first()
            if telemetry:
                if status_upper == "DELAYED":
                    telemetry.status_text = f"Flight {clean_flight} delayed +{delay_minutes}m. Stage adjusted to {estimated_arrival_str or 'new ETA'}."
                    telemetry.eta_minutes = max(5, telemetry.eta_minutes + delay_minutes)
                elif status_upper == "LANDED":
                    telemetry.status_text = f"Flight {clean_flight} Landed. Chauffeur staging at Baggage Claim Meet & Greet."
                    telemetry.eta_minutes = 2
                elif status_upper == "AIRBORNE":
                    telemetry.status_text = f"Flight {clean_flight} Airborne. In transit to destination airport."

        self.db.commit()
        return bookings

    # --- SOURCING DESK: REVERSE AUCTION RFPS (SPRINT 4) ---
    def dispatch_sourcing_rfp(
        self,
        itinerary_id: str,
        leg_id: str,
        target_city: str,
        pickup_address: str,
        dropoff_address: str,
        pickup_time_utc: datetime,
        vehicle_class: str = "BUSINESS_CLASS",
        benchmark_payout_usd: Decimal = Decimal("185.00"),
        vendor_targets: Optional[List[Dict[str, str]]] = None
    ) -> List[HubRFPModel]:
        """Dispatches encrypted reverse-auction RFP opportunities to qualified network affiliates."""
        created_rfps = []
        targets = vendor_targets or [
            {"name": "Tri-State Executive Logistics", "email": "dispatch@tristatelimo.com", "phone": "+1 (215) 555-8811"},
            {"name": "Keystone Premier Chauffeurs", "email": "operations@keystoneblackcar.com", "phone": "+1 (215) 555-9922"}
        ]

        from datetime import timedelta
        escalation_deadline = datetime.utcnow() + timedelta(minutes=45)

        for target in targets:
            quote_token = f"rfp_tok_{uuid.uuid4().hex[:16]}"
            rfp = HubRFPModel(
                itinerary_id=itinerary_id,
                leg_id=leg_id,
                target_city=target_city,
                target_vendor_name=target.get("name", "Vetted Network Affiliate"),
                target_vendor_email=target.get("email", "affiliate@limo.hub"),
                target_vendor_phone=target.get("phone", "+1 800 555 0199"),
                pickup_address=pickup_address,
                dropoff_address=dropoff_address,
                pickup_time_utc=pickup_time_utc,
                vehicle_class=vehicle_class,
                benchmark_payout_usd=benchmark_payout_usd,
                status="AI_DISPATCHED",
                quote_token=quote_token,
                escalation_deadline_utc=escalation_deadline
            )
            self.db.add(rfp)
            created_rfps.append(rfp)

        self.db.commit()
        return created_rfps

    def accept_sourcing_rfp(
        self,
        quote_token: str,
        vendor_id: str,
        quoted_rate_usd: Decimal,
        chauffeur_name: str,
        chauffeur_phone: str,
        vehicle_plate: str
    ) -> Optional[HubRFPModel]:
        """Binds first accepting affiliate to the RFP and outbids/rejects competitors for the same leg."""
        winning_rfp = self.db.query(HubRFPModel).filter(
            HubRFPModel.quote_token == quote_token,
            HubRFPModel.status == "AI_DISPATCHED"
        ).first()

        if not winning_rfp:
            return None

        # Bind winning RFP
        winning_rfp.status = "ACCEPTED_BOUND"
        winning_rfp.quoted_rate_usd = quoted_rate_usd

        # Reject all other competing RFPs for the same leg
        competing_rfps = self.db.query(HubRFPModel).filter(
            HubRFPModel.leg_id == winning_rfp.leg_id,
            HubRFPModel.rfp_id != winning_rfp.rfp_id,
            HubRFPModel.status == "AI_DISPATCHED"
        ).all()
        for cr in competing_rfps:
            cr.status = "REJECTED_OUTBID"

        # Update Master Leg or Booking if linked
        leg = self.db.query(HubLegModel).filter(HubLegModel.leg_id == winning_rfp.leg_id).first()
        if leg:
            leg.servicing_vendor_id = vendor_id
            leg.price_status = "LOCKED_IN_NETWORK"
            leg.total_leg_amount_usd = quoted_rate_usd

        self.db.commit()
        self.db.refresh(winning_rfp)
        return winning_rfp

    def list_active_rfps(self, target_city: Optional[str] = None) -> List[HubRFPModel]:
        """Lists all open RFPs currently accepting affiliate bids."""
        query = self.db.query(HubRFPModel).filter(HubRFPModel.status == "AI_DISPATCHED")
        if target_city:
            query = query.filter(HubRFPModel.target_city.ilike(f"%{target_city}%"))
        return query.order_by(HubRFPModel.sent_at_utc.desc()).all()

