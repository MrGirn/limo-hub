"""
Authoritative Database with MySQL and InMemory persistence for US & Multi-Region Operations.
Provides multi-tenant partitioning, pre-seeded US executive fleet (Escalade, S 580, Sprinter),
certified chauffeurs, NYC/LA vendor depots, and active trip telemetry.
"""

import logging
from typing import Dict, List, Optional, Any
from decimal import Decimal
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("LimoDatabase")
from app.domain_models import (
    Tenant, Vendor, Vehicle, Driver, VehicleClass, Quote, Booking, Trip,
    TripEvent, TripStatus, BookingStatus, BookingParty, ServiceType,
    PaymentAttempt, DriverOffer, DriverOfferStatus, Incident,
    NetworkParticipationMode, VendorPricingRule, VendorAIDynamicPricingMetrics,
    VendorCommConfig, TransitRadarEvent, PlanUpdateRequest, DistanceUnit,
    VendorFrequentRoute, CorporateAccount, DepartmentCostCenter, CorporateTravelPolicy,
    CorporateInvoice, CorporateInvoiceLineItem, RegionalTaxRule, FXRateSnapshot,
    Customer, CustomerSavedAddress
)
from app.database_mysql import (
    mysql_db, TenantModel, VendorModel, VehicleModel, DriverModel,
    QuoteModel, BookingModel, TripModel, TripEventModel, IncidentModel,
    CustomerModel, CustomerSavedAddressModel, VendorEmailConfigModel,
    VendorPricingRuleModel, VendorTeamMemberModel, VendorOmnichannelConfigModel
)


class LimoDatabase:
    def __init__(self):
        self.tenants: Dict[str, Tenant] = {}
        self.vendors: Dict[str, Vendor] = {}
        self.vehicles: Dict[str, Vehicle] = {}
        self.drivers: Dict[str, Driver] = {}
        self.quotes: Dict[str, Quote] = {}
        self.bookings: Dict[str, Booking] = {}
        self.trips: Dict[str, Trip] = {}
        self.driver_offers: Dict[str, DriverOffer] = {}
        self.incidents: List[Incident] = []
        self.outbox_events: List[Dict] = []
        
        # Corporate Travel & Multi-Currency Subsystems
        self.corporate_accounts: Dict[str, CorporateAccount] = {}
        self.corporate_invoices: Dict[str, CorporateInvoice] = {}
        self.regional_tax_rules: Dict[str, RegionalTaxRule] = {}
        self.fx_rates: Dict[str, Decimal] = {
            "USD": Decimal("1.00"),
            "EUR": Decimal("0.92"),
            "GBP": Decimal("0.78"),
            "JPY": Decimal("155.00"),
            "AED": Decimal("3.67"),
            "CAD": Decimal("1.36"),
            "CHF": Decimal("0.90")
        }
        
        # Strategic Research & Operational Governance Subsystems
        self.compliance_alerts: List[Any] = []
        self.sourcing_inquiries: Dict[str, Any] = {}
        self.service_eligibility_records: Dict[str, Any] = {}
        self.assignment_audits: Dict[str, Any] = {}
        self.webhook_events: List[Any] = []
        self.split_settlements: Dict[str, Any] = {}
        self.itineraries: Dict[str, Any] = {}
        
        # Customer CRM & 5-Star VIP Preference Subsystem
        self.customers: Dict[str, Customer] = {}
        
        # Vendor Autonomy & Operational Subsystems
        self.vendor_pricing_rules: Dict[str, Dict[str, VendorPricingRule]] = {}  # vendor_id -> { vehicle_class -> rule }
        self.vendor_ai_metrics: Dict[str, VendorAIDynamicPricingMetrics] = {}     # vendor_id -> AI Dynamic Yield Metrics
        self.vendor_comm_configs: Dict[str, VendorCommConfig] = {}               # vendor_id -> AWS SES / Custom SMTP
        self.transit_radar_events: List[TransitRadarEvent] = []                  # Live FlightAware & Transit logs
        
        self.seed_defaults()
        self.sync_from_mysql_if_available()

    def sync_from_mysql_if_available(self):
        try:
            session = mysql_db.get_session()
            if not session:
                return
            with session:
                # Check if MySQL is empty; if so, push in-memory seeded tenants, vendors, vehicles, drivers & customers
                if session.query(VendorModel).count() == 0:
                    for t_id, t in self.tenants.items():
                        if not session.query(TenantModel).filter_by(id=t_id).first():
                            session.add(TenantModel(
                                id=t.id,
                                name=t.name,
                                country_code=t.country_code,
                                default_currency=t.default_currency,
                                is_active=t.is_active
                            ))
                    session.flush()

                    for v_id, v in self.vendors.items():
                        if not session.query(VendorModel).filter_by(id=v_id).first():
                            session.add(VendorModel(
                                id=v.id,
                                tenant_id=v.tenant_id,
                                name=v.name,
                                legal_name=v.legal_name,
                                tax_id=v.tax_id,
                                contact_email=v.contact_email,
                                contact_phone=v.contact_phone,
                                office_address=v.office_address or "550 W 54th St, New York, NY 10019",
                                office_city=v.office_city or "New York",
                                office_state=v.office_state or "NY",
                                office_zip=v.office_zip or "10019",
                                office_lat=v.office_lat or 40.7675,
                                office_lng=v.office_lng or -73.9912,
                                service_radius_miles=v.service_radius_miles or 65.0,
                                deadhead_rate_per_mile=v.deadhead_rate_per_mile or Decimal("1.75"),
                                rating=v.rating or 4.97,
                                is_verified=v.is_verified,
                                network_sharing_enabled=v.network_sharing_enabled
                            ))
                    session.flush()

                    for veh_id, veh in self.vehicles.items():
                        if not session.query(VehicleModel).filter_by(id=veh_id).first():
                            session.add(VehicleModel(
                                id=veh.id,
                                tenant_id=veh.tenant_id,
                                vendor_id=veh.vendor_id,
                                make=veh.make,
                                model=veh.model,
                                year=veh.year,
                                license_plate=veh.license_plate,
                                vehicle_class=veh.vehicle_class.value if hasattr(veh.vehicle_class, 'value') else veh.vehicle_class,
                                passenger_capacity=veh.passenger_capacity,
                                luggage_capacity=veh.luggage_capacity,
                                exterior_color=veh.exterior_color,
                                is_active=veh.is_active,
                                current_lat=veh.current_lat,
                                current_lng=veh.current_lng
                            ))

                    for d_id, d in self.drivers.items():
                        if not session.query(DriverModel).filter_by(id=d_id).first():
                            session.add(DriverModel(
                                id=d.id,
                                tenant_id=d.tenant_id,
                                vendor_id=d.vendor_id,
                                first_name=d.first_name,
                                last_name=d.last_name,
                                email=d.email,
                                phone=d.phone,
                                license_number=d.license_number,
                                license_expiry=d.license_expiry,
                                rating=d.rating,
                                trips_completed=d.trips_completed,
                                is_on_duty=d.is_on_duty,
                                current_vehicle_id=d.current_vehicle_id,
                                current_lat=d.current_lat,
                                current_lng=d.current_lng
                            ))

                    for cust_id, cust in self.customers.items():
                        if not session.query(CustomerModel).filter_by(id=cust_id).first():
                            c_model = CustomerModel(
                                id=cust.id,
                                vendor_id=cust.vendor_id,
                                full_name=cust.full_name,
                                email=cust.email,
                                phone=cust.phone,
                                company_name=cust.company_name,
                                corporate_account_id=cust.corporate_account_id,
                                vip_tier=cust.vip_tier,
                                preferred_vehicle_class=cust.preferred_vehicle_class.value if hasattr(cust.preferred_vehicle_class, 'value') else cust.preferred_vehicle_class,
                                preferred_driver_id=cust.preferred_driver_id,
                                target_cabin_temp_f=cust.target_cabin_temp_f,
                                cabin_audio_preference=cust.cabin_audio_preference,
                                beverage_preference=cust.beverage_preference,
                                seating_notes=cust.seating_notes,
                                chauffeur_etiquette_notes=cust.chauffeur_etiquette_notes,
                                stripe_customer_id=cust.stripe_customer_id,
                                default_billing_reference=cust.default_billing_reference,
                                total_trips_completed=cust.total_trips_completed,
                                lifetime_spend_usd=cust.lifetime_spend_usd
                            )
                            session.add(c_model)
                            session.flush()
                            for addr in cust.saved_addresses:
                                session.add(CustomerSavedAddressModel(
                                    id=addr.id,
                                    customer_id=c_model.id,
                                    label=addr.label,
                                    formatted_address=addr.formatted_address,
                                    lat=addr.lat,
                                    lng=addr.lng,
                                    is_default_pickup=addr.is_default_pickup,
                                    is_default_dropoff=addr.is_default_dropoff
                                ))
                    session.commit()
                    print("Initial authoritative state successfully pushed to MySQL database!")

                # Load tenants
                for t in session.query(TenantModel).all():
                    self.tenants[t.id] = Tenant(
                        id=t.id,
                        name=t.name,
                        country_code=t.country_code or "US",
                        default_currency=t.default_currency or "USD",
                        is_active=t.is_active
                    )
                # Load vendors with office addresses
                for v in session.query(VendorModel).all():
                    self.vendors[v.id] = Vendor(
                        id=v.id,
                        tenant_id=v.tenant_id,
                        name=v.name,
                        legal_name=v.legal_name,
                        tax_id=v.tax_id,
                        contact_email=v.contact_email,
                        contact_phone=v.contact_phone,
                        office_address=v.office_address or "550 W 54th St, New York, NY 10019",
                        office_city=v.office_city or "New York",
                        office_state=v.office_state or "NY",
                        office_zip=v.office_zip or "10019",
                        office_lat=v.office_lat or 40.7675,
                        office_lng=v.office_lng or -73.9912,
                        service_radius_miles=v.service_radius_miles or 65.0,
                        deadhead_rate_per_mile=Decimal(str(v.deadhead_rate_per_mile or "1.75")),
                        rating=v.rating,
                        is_verified=v.is_verified,
                        network_sharing_enabled=v.network_sharing_enabled
                    )
                # Load vehicles
                for veh in session.query(VehicleModel).all():
                    self.vehicles[veh.id] = Vehicle(
                        id=veh.id,
                        tenant_id=veh.tenant_id,
                        vendor_id=veh.vendor_id,
                        make=veh.make,
                        model=veh.model,
                        year=veh.year,
                        license_plate=veh.license_plate,
                        vehicle_class=VehicleClass(veh.vehicle_class),
                        passenger_capacity=veh.passenger_capacity,
                        luggage_capacity=veh.luggage_capacity,
                        exterior_color=veh.exterior_color,
                        is_active=veh.is_active,
                        current_lat=veh.current_lat,
                        current_lng=veh.current_lng
                    )
                # Load drivers
                for d in session.query(DriverModel).all():
                    self.drivers[d.id] = Driver(
                        id=d.id,
                        tenant_id=d.tenant_id,
                        vendor_id=d.vendor_id,
                        first_name=d.first_name,
                        last_name=d.last_name,
                        email=d.email,
                        phone=d.phone,
                        license_number=d.license_number,
                        license_expiry=d.license_expiry,
                        rating=d.rating,
                        trips_completed=d.trips_completed,
                        is_on_duty=d.is_on_duty,
                        current_vehicle_id=d.current_vehicle_id,
                        current_lat=d.current_lat,
                        current_lng=d.current_lng
                    )
                # Load Customers and Saved Addresses
                for c_db in session.query(CustomerModel).all():
                    saved_addrs = [
                        CustomerSavedAddress(
                            id=a.id,
                            customer_id=a.customer_id,
                            label=a.label,
                            formatted_address=a.formatted_address,
                            lat=a.lat,
                            lng=a.lng,
                            is_default_pickup=a.is_default_pickup,
                            is_default_dropoff=a.is_default_dropoff
                        ) for a in (c_db.saved_addresses or [])
                    ]
                    self.customers[c_db.id] = Customer(
                        id=c_db.id,
                        vendor_id=c_db.vendor_id,
                        full_name=c_db.full_name,
                        email=c_db.email,
                        phone=c_db.phone,
                        company_name=c_db.company_name,
                        corporate_account_id=c_db.corporate_account_id,
                        vip_tier=c_db.vip_tier or "VIP",
                        preferred_vehicle_class=VehicleClass(c_db.preferred_vehicle_class) if c_db.preferred_vehicle_class else VehicleClass.LUXURY_SUV,
                        preferred_driver_id=c_db.preferred_driver_id,
                        target_cabin_temp_f=c_db.target_cabin_temp_f or 68,
                        cabin_audio_preference=c_db.cabin_audio_preference or "Quiet Ride / Do Not Disturb",
                        beverage_preference=c_db.beverage_preference or "Chilled Fiji Water",
                        seating_notes=c_db.seating_notes,
                        chauffeur_etiquette_notes=c_db.chauffeur_etiquette_notes,
                        stripe_customer_id=c_db.stripe_customer_id,
                        default_billing_reference=c_db.default_billing_reference,
                        total_trips_completed=c_db.total_trips_completed or 0,
                        lifetime_spend_usd=Decimal(str(c_db.lifetime_spend_usd or "0.00")),
                        saved_addresses=saved_addrs
                    )

                # Load bookings
                for b in session.query(BookingModel).all():
                    q_model = session.query(QuoteModel).filter_by(id=b.quote_id).first()
                    quote_obj = None
                    if q_model:
                        quote_obj = Quote(
                            id=q_model.id,
                            tenant_id=q_model.tenant_id,
                            vendor_id=q_model.vendor_id,
                            service_type=ServiceType(q_model.service_type),
                            vehicle_class=VehicleClass(q_model.vehicle_class),
                            pickup_address=q_model.pickup_address,
                            dropoff_address=q_model.dropoff_address,
                            flight_number=q_model.flight_number,
                            distance_miles=Decimal(str(q_model.distance_miles)),
                            estimated_duration_min=q_model.estimated_duration_min,
                            currency=q_model.currency,
                            base_net=Decimal(str(q_model.base_net)),
                            distance_net=Decimal(str(q_model.distance_net)),
                            wait_net=Decimal(str(q_model.wait_net)),
                            surcharges_net=Decimal(str(getattr(q_model, 'surcharges_net', None) or getattr(q_model, 'airport_train_surcharge_net', '0.00') or "0.00")),
                            deadhead_fee_net=Decimal(str(getattr(q_model, 'deadhead_fee_net', None) or getattr(q_model, 'return_deadhead_net', '0.00') or "0.00")),
                            subtotal_net=Decimal(str(q_model.subtotal_net or "0.00")),
                            tax_rate=Decimal(str(q_model.tax_rate or "0.08875")),
                            tax_amount=Decimal(str(q_model.tax_amount or "0.00")),
                            gratuity_rate=Decimal(str(q_model.gratuity_rate or "0.20")),
                            gratuity_amount=Decimal(str(q_model.gratuity_amount or "0.00")),
                            total_gross=Decimal(str(q_model.total_gross or "0.00")),
                            final_payable_amount=Decimal(str(q_model.final_payable_amount or "0.00")),
                            vendor_office_address=q_model.vendor_office_address,
                            vendor_depot_distance_miles=Decimal(str(getattr(q_model, 'vendor_depot_distance_miles', None) or getattr(q_model, 'outbound_positioning_miles', '0.00') or "0.00")),
                            is_binding=q_model.is_binding,
                            expires_at=q_model.expires_at or datetime.now(timezone.utc),
                            created_at=q_model.created_at or datetime.now(timezone.utc)
                        )
                        self.quotes[quote_obj.id] = quote_obj

                    t_model = session.query(TripModel).filter_by(booking_id=b.id).first()
                    trip_obj = None
                    if t_model:
                        trip_obj = Trip(
                            id=t_model.id,
                            booking_id=t_model.booking_id,
                            tenant_id=t_model.tenant_id,
                            vendor_id=t_model.vendor_id,
                            driver_id=t_model.driver_id,
                            vehicle_id=t_model.vehicle_id,
                            status=TripStatus(t_model.status),
                            pickup_time_utc=t_model.pickup_time_utc or datetime.now(timezone.utc),
                            pickup_address=t_model.pickup_address,
                            dropoff_address=t_model.dropoff_address,
                            flight_number=t_model.flight_number,
                            flight_delay_minutes=t_model.flight_delay_minutes,
                            driver_current_lat=t_model.driver_current_lat,
                            driver_current_lng=t_model.driver_current_lng
                        )
                        self.trips[trip_obj.id] = trip_obj

                    if quote_obj:
                        self.bookings[b.id] = Booking(
                            id=b.id,
                            tenant_id=b.tenant_id,
                            vendor_id=b.vendor_id,
                            quote_id=b.quote_id,
                            status=BookingStatus(b.status),
                            service_type=ServiceType(b.service_type),
                            vehicle_class=VehicleClass(b.vehicle_class),
                            pickup_time_utc=b.pickup_time_utc or datetime.now(timezone.utc),
                            pickup_address=b.pickup_address,
                            dropoff_address=b.dropoff_address,
                            flight_number=b.flight_number,
                            party=BookingParty(
                                booker_name=b.booker_name,
                                booker_email=b.booker_email,
                                booker_phone=b.booker_phone,
                                passenger_name=b.passenger_name,
                                passenger_phone=b.passenger_phone,
                                passenger_count=b.passenger_count,
                                luggage_count=b.luggage_count,
                                special_instructions=b.special_instructions
                            ),
                            total_amount=Decimal(str(b.total_amount)),
                            currency=b.currency,
                            quote=quote_obj,
                            trip=trip_obj,
                            created_at=b.created_at or datetime.now(timezone.utc)
                        )
            print("Successfully synced US operational records & Customer CRM from MySQL!")
        except Exception as e:
            print(f"Note: MySQL sync not available or deferred: {e}")

    def sync_vendor_to_mysql(self, vendor_id: str):
        """Persists or updates a single vendor entity and its fleet to MySQL."""
        try:
            session = mysql_db.get_session()
            if not session:
                return
            with session:
                v = self.vendors.get(vendor_id)
                if not v:
                    return
                
                # Check/Create tenant
                t = self.tenants.get(v.tenant_id)
                if t and not session.query(TenantModel).filter_by(id=t.id).first():
                    session.add(TenantModel(
                        id=t.id,
                        name=t.name,
                        country_code=t.country_code,
                        default_currency=t.default_currency,
                        is_active=t.is_active
                    ))
                    session.flush()

                # Upsert vendor
                existing_v = session.query(VendorModel).filter_by(id=v.id).first()
                if not existing_v:
                    session.add(VendorModel(
                        id=v.id,
                        tenant_id=v.tenant_id,
                        name=v.name,
                        legal_name=v.legal_name,
                        tax_id=v.tax_id,
                        contact_email=v.contact_email,
                        contact_phone=v.contact_phone,
                        office_address=v.office_address or f"{v.office_city or 'Executive'}, {v.office_state or 'Depot'}",
                        office_city=v.office_city or "New York",
                        office_state=v.office_state or "NY",
                        office_zip=v.office_zip or "10019",
                        office_lat=v.office_lat or 40.7675,
                        office_lng=v.office_lng or -73.9912,
                        service_radius_miles=v.service_radius_miles or 65.0,
                        deadhead_rate_per_mile=v.deadhead_rate_per_mile or Decimal("1.75"),
                        rating=v.rating or 4.97,
                        is_verified=v.is_verified,
                        network_sharing_enabled=v.network_sharing_enabled
                    ))
                else:
                    existing_v.name = v.name
                    existing_v.legal_name = v.legal_name
                    existing_v.contact_email = v.contact_email
                    existing_v.contact_phone = v.contact_phone
                    existing_v.office_address = v.office_address
                    existing_v.office_city = v.office_city
                    existing_v.office_state = v.office_state
                session.flush()

                # Upsert vehicles belonging to this vendor
                for veh_id, veh in self.vehicles.items():
                    if veh.vendor_id == v.id and not session.query(VehicleModel).filter_by(id=veh_id).first():
                        session.add(VehicleModel(
                            id=veh.id,
                            tenant_id=veh.tenant_id,
                            vendor_id=veh.vendor_id,
                            make=veh.make,
                            model=veh.model,
                            year=veh.year,
                            license_plate=veh.license_plate,
                            vehicle_class=veh.vehicle_class.value if hasattr(veh.vehicle_class, 'value') else veh.vehicle_class,
                            passenger_capacity=veh.passenger_capacity,
                            luggage_capacity=veh.luggage_capacity,
                            exterior_color=veh.exterior_color,
                            is_active=veh.is_active,
                            current_lat=veh.current_lat,
                            current_lng=veh.current_lng
                        ))

                # Upsert drivers belonging to this vendor
                for d_id, d in self.drivers.items():
                    if d.vendor_id == v.id and not session.query(DriverModel).filter_by(id=d_id).first():
                        session.add(DriverModel(
                            id=d.id,
                            tenant_id=d.tenant_id,
                            vendor_id=d.vendor_id,
                            first_name=d.first_name,
                            last_name=d.last_name,
                            email=d.email,
                            phone=d.phone,
                            license_number=d.license_number,
                            license_expiry=d.license_expiry,
                            rating=d.rating,
                            trips_completed=d.trips_completed,
                            is_on_duty=d.is_on_duty,
                            current_vehicle_id=d.current_vehicle_id,
                            current_lat=d.current_lat,
                            current_lng=d.current_lng
                        ))
                session.commit()
        except Exception as e:
            logger.debug(f"MySQL vendor persist deferred: {e}")

    def sync_all_vendors_to_mysql(self):
        """Persists all current vendors in memory to MySQL database."""
        for v_id in list(self.vendors.keys()):
            self.sync_vendor_to_mysql(v_id)

    def seed_defaults(self):
        """
        Dynamically initializes authoritative database partitions:
        1. Base Tenants & Regional Tax Jurisdictions.
        2. Dynamic Declarative Loading of all Vendor Cells from YAML specs.
        3. Corporate Travel Accounts directory without fake dummy trips or mock bookings.
        """
        # 1. Base Tenants
        self.tenants["tenant-us-east"] = Tenant(
            id="tenant-us-east",
            name="Limo US East Coast VIP Network",
            country_code="US",
            default_currency="USD"
        )
        self.tenants["tenant-us-west"] = Tenant(
            id="tenant-us-west",
            name="Limo US West Coast Operations",
            country_code="US",
            default_currency="USD"
        )
        self.tenants["tenant-uk-london"] = Tenant(
            id="tenant-uk-london",
            name="Limo UK & European Network",
            country_code="GB",
            default_currency="GBP"
        )
        # 2. Dynamic Declarative Loading of all Vendor Cells from YAML specs
        try:
            from app.services.vendor_spinup_service import vendor_spinup_service
            vendor_spinup_service.load_all_declarative_definitions(db_instance=self)
        except Exception as e:
            print(f"Vendor declarative spinup deferred or completed: {e}")

        # 3. FlightAware & Transit Live Radar Stream
        self.transit_radar_events = [
            TransitRadarEvent(
                id="radar-event-01",
                source="FLIGHTAWARE_RADAR",
                carrier="British Airways",
                flight_or_train_number="BA 178",
                origin="LHR (London Heathrow)",
                destination="JFK (New York)",
                scheduled_arrival="17:45 UTC",
                estimated_arrival="18:30 UTC",
                delay_minutes=45,
                gate_or_terminal="Terminal 7 VIP Gate 4",
                status_summary="In-Flight — 45 Min Weather Delay over Atlantic"
            ),
            TransitRadarEvent(
                id="radar-event-02",
                source="AMTRAK_TRACKER",
                carrier="Amtrak Acela Express",
                flight_or_train_number="Acela 2150",
                origin="WAS (Washington Union Station)",
                destination="NYP (Moynihan Train Hall)",
                scheduled_arrival="14:15 UTC",
                estimated_arrival="14:15 UTC",
                delay_minutes=0,
                gate_or_terminal="Track 11 West",
                status_summary="On Time — High-Speed Cruising at 145 mph"
            )
        ]

        # 9. Multi-Region Tax & Airport Surcharge Rules
        self.regional_tax_rules = {
            "US_NY": RegionalTaxRule(
                jurisdiction_code="US_NY",
                country="United States",
                city_or_region="New York",
                vat_or_sales_tax_rate=Decimal("0.08875"),
                airport_access_fee=Decimal("18.00"),
                congestion_charge=Decimal("0.00"),
                currency="USD",
                notes="NY State & City combined sales tax 8.875% with Port Authority airport access fee"
            ),
            "UK_LON": RegionalTaxRule(
                jurisdiction_code="UK_LON",
                country="United Kingdom",
                city_or_region="London",
                vat_or_sales_tax_rate=Decimal("0.20"),
                airport_access_fee=Decimal("5.50"),
                congestion_charge=Decimal("15.00"),
                currency="GBP",
                notes="HM Revenue & Customs standard 20% VAT with TfL London Congestion and Heathrow Terminal Dropoff charge"
            ),
            "EU_FR": RegionalTaxRule(
                jurisdiction_code="EU_FR",
                country="France",
                city_or_region="Paris",
                vat_or_sales_tax_rate=Decimal("0.20"),
                airport_access_fee=Decimal("12.00"),
                congestion_charge=Decimal("0.00"),
                currency="EUR",
                notes="French standard 20% TVA / VAT with CDG/ORY VIP access surcharge"
            ),
            "JP_TYO": RegionalTaxRule(
                jurisdiction_code="JP_TYO",
                country="Japan",
                city_or_region="Tokyo",
                vat_or_sales_tax_rate=Decimal("0.10"),
                airport_access_fee=Decimal("2000.00"),
                congestion_charge=Decimal("0.00"),
                currency="JPY",
                notes="Japan National Consumption Tax (JCT 10%) with Haneda/Narita airport chauffeur pass"
            ),
            "AE_DXB": RegionalTaxRule(
                jurisdiction_code="AE_DXB",
                country="UAE",
                city_or_region="Dubai",
                vat_or_sales_tax_rate=Decimal("0.05"),
                airport_access_fee=Decimal("25.00"),
                congestion_charge=Decimal("0.00"),
                currency="AED",
                notes="Federal Tax Authority 5% VAT with DXB VIP Terminal Chauffeur staging"
            )
        }

        # 10. Enterprise Corporate Accounts & Department Cost Centers
        gs_account = CorporateAccount(
            id="corp-gs-global",
            name="Goldman Sachs Global Travel",
            company_tax_id="US-EIN-13265101",
            billing_email="travel-invoicing@gs.com",
            default_currency="USD",
            monthly_credit_limit=Decimal("100000.00"),
            current_balance=Decimal("23150.00"),
            cost_centers=[
                DepartmentCostCenter(id="cc-exec-01", code="EXEC-100", name="Executive Leadership & Board", monthly_budget=Decimal("35000.00"), current_month_spend=Decimal("4250.00"), currency="USD"),
                DepartmentCostCenter(id="cc-ib-02", code="IB-200", name="Investment Banking NYC", monthly_budget=Decimal("40000.00"), current_month_spend=Decimal("12800.00"), currency="USD"),
                DepartmentCostCenter(id="cc-tech-03", code="ENG-300", name="Global Engineering EMEA", monthly_budget=Decimal("25000.00"), current_month_spend=Decimal("6100.00"), currency="USD")
            ],
            travel_policy=CorporateTravelPolicy(
                max_vehicle_class=VehicleClass.FIRST_CLASS,
                max_spend_per_trip=Decimal("750.00"),
                auto_approve_threshold=Decimal("400.00"),
                require_flight_number_for_airports=True,
                allow_multi_leg_international=True
            )
        )
        self.corporate_accounts[gs_account.id] = gs_account

        mck_account = CorporateAccount(
            id="corp-mck-travel",
            name="McKinsey & Company Executive Transport",
            company_tax_id="US-EIN-13192348",
            billing_email="ap-travel@mckinsey.com",
            default_currency="USD",
            monthly_credit_limit=Decimal("75000.00"),
            current_balance=Decimal("23600.00"),
            cost_centers=[
                DepartmentCostCenter(id="cc-strat-01", code="STRAT-10", name="Strategy & Operations", monthly_budget=Decimal("30000.00"), current_month_spend=Decimal("8400.00"), currency="USD"),
                DepartmentCostCenter(id="cc-part-02", code="PART-99", name="Senior Partner Direct", monthly_budget=Decimal("45000.00"), current_month_spend=Decimal("15200.00"), currency="USD")
            ],
            travel_policy=CorporateTravelPolicy(
                max_vehicle_class=VehicleClass.FIRST_CLASS,
                max_spend_per_trip=Decimal("600.00"),
                auto_approve_threshold=Decimal("350.00"),
                require_flight_number_for_airports=True,
                allow_multi_leg_international=True
            )
        )
        self.corporate_accounts[mck_account.id] = mck_account



# Global singleton database instance
db = LimoDatabase()

