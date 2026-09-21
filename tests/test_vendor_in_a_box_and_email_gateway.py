"""
Unit & Integration Test Suite for Single-Tenant Vendor-in-a-Box,
Declarative Spin-Up, Inbound/Outbound Email Gateway, and B2B Affiliate Cross-Dispatch.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.domain_models import VehicleClass
from app.services.vendor_cell_engine import vendor_cell_registry
from app.services.vendor_spinup_service import vendor_spinup_service, VendorSpinUpPayload, VendorBrandingProfile
from app.services.vendor_email_gateway_service import VendorEmailGatewayService
from app.services.vendor_affiliate_exchange_service import vendor_affiliate_exchange_service

client = TestClient(app)


def test_declarative_spin_up_service():
    """Tests programmatic and declarative spin-up of a sovereign vendor cell."""
    payload = VendorSpinUpPayload(
        vendor_id="vendor_chicago_windy",
        name="Windy City VIP Chauffeurs (Chicago, IL)",
        tier="AUTONOMOUS_T1",
        region="Greater Chicago Area (ORD/MDW)",
        currency="USD",
        base_rate_usd=80.00,
        per_km_usd=3.60,
        tax_rate_pct=9.00,
        domain="windycity-limo.com",
        inbound_email="dispatch@windycity-limo.com",
        contact_phone="+13125550199",
        drivers=[
            {"id": "driver_ord_01", "name": "Stanislaw Kowalski", "vehicle": "Cadillac Escalade ESV"}
        ],
        branding=VendorBrandingProfile(
            company_tagline="Chicago Premier Airport & Executive Transport",
            primary_color="#047857",
            accent_color="#F59E0B",
            domain="windycity-limo.com",
            contact_phone="+13125550199"
        )
    )

    config = vendor_spinup_service.spin_up_vendor(payload)
    assert config.vendor_id == "vendor_chicago_windy"
    assert config.vendor_name == "Windy City VIP Chauffeurs (Chicago, IL)"
    assert config.tier == "AUTONOMOUS_T1"
    assert config.local_currency == "USD"

    # Verify cell exists in registry
    cell = vendor_cell_registry.get_cell("vendor_chicago_windy")
    assert cell is not None
    assert cell.config.local_base_rate_usd == 80.00
    assert cell.config.local_per_km_rate_usd == 3.60


def test_inbound_email_rfq_parsing():
    """Tests inbound email parser extracting passenger, pickup, dropoff, flight and calculating quote."""
    gateway = VendorEmailGatewayService(
        vendor_id="vendor_anb_philly",
        domain="anblimo-philly.com",
        sender_name="ANB Limo Dispatch"
    )

    sample_email = """
    Hello ANB Team,
    Please book a luxury SUV for passenger: Senator Alexander Sterling, phone: +12155550199.
    Pickup: Philadelphia International Airport (PHL) Terminal A
    Dropoff: The Ritz-Carlton Philadelphia, 10 Avenue of the Arts
    Flight: AA 1204 arriving tomorrow at 4:30 PM.
    Please send confirmation and receipt.
    """

    rfq = gateway.parse_inbound_email(
        sender_email="traveldesk@senate.gov",
        subject="VIP Chauffeur Request - PHL Airport",
        body=sample_email,
        base_rate=75.0,
        per_km=3.25,
        tax_pct=8.0
    )

    assert rfq.vendor_id == "vendor_anb_philly"
    assert "Sterling" in (rfq.parsed_passenger_name or "")
    assert "PHL" in (rfq.parsed_pickup or "")
    assert rfq.parsed_flight_number == "AA 1204"
    assert rfq.parsed_vehicle_class == VehicleClass.LUXURY_SUV
    assert rfq.quoted_amount_usd > 100.0


def test_outbound_email_generation_and_dkim():
    """Tests outbound confirmation generation with SPF/DKIM headers and branded HTML."""
    gateway = VendorEmailGatewayService(
        vendor_id="vendor_anb_philly",
        domain="anblimo-philly.com",
        sender_name="ANB Limo Dispatch"
    )

    msg = gateway.generate_and_send_outbound_confirmation(
        recipient_email="sterling@senate.gov",
        booking_id="bk_philly_901",
        passenger_name="Senator Alexander Sterling",
        pickup_address="Philadelphia International Airport (PHL) Terminal A",
        dropoff_address="The Ritz-Carlton Philadelphia, 10 Avenue of the Arts",
        vehicle_class="LUXURY_SUV",
        amount_usd=146.06,
        driver_name="Marcus Brody",
        driver_phone="+12155550991",
        vehicle_info="Cadillac Escalade ESV (Plate: PA-LM992)",
        company_name="ANB Limo Company"
    )

    assert msg.vendor_id == "vendor_anb_philly"
    assert msg.recipient_email == "sterling@senate.gov"
    assert "ANB Limo Company" in msg.html_content
    assert "PA-LM992" in msg.html_content
    assert "rsa-sha256" in msg.dkim_signature
    assert msg.spf_record_status == "PASS_VERIFIED"


def test_b2b_affiliate_cross_dispatch_and_escrow():
    """Tests cross-dispatch from Empire NY to ANB Limo Philly with 85/10/5 escrow calculation."""
    record = vendor_affiliate_exchange_service.farm_out_ride(
        originator_vendor_id="vendor_ny_executive",
        performing_vendor_id="vendor_anb_philly",
        passenger_name="Elena Rostova",
        passenger_phone="+12125550199",
        pickup_address="Philadelphia International Airport (PHL) Terminal A",
        dropoff_address="The Ritz-Carlton Philadelphia",
        distance_km=18.2,
        vehicle_class=VehicleClass.FIRST_CLASS
    )

    assert record.originator_vendor_id == "vendor_ny_executive"
    assert record.performing_vendor_id == "vendor_anb_philly"
    assert record.status == "ACCEPTED_DISPATCHED"
    assert record.assigned_driver_id is not None

    # Check 85% / 10% / 5% math
    split = record.fare_split
    assert split.performing_vendor_net_usd > 0
    assert split.originating_vendor_commission_usd > 0
    assert round(split.performing_vendor_net_usd + split.originating_vendor_commission_usd + split.hub_clearing_fee_usd, 2) == split.gross_fare_usd


def test_api_vendor_in_a_box_endpoints():
    """Tests all REST endpoints for spin-up, email parsing, outbound dispatch, and affiliate records."""
    # 1. Spin-Up API
    spin_payload = {
        "vendor_id": "vendor_boston_beacon",
        "name": "Beacon Hill Executive Limo (Boston, MA)",
        "tier": "AUTONOMOUS_T1",
        "region": "Greater Boston & Logan Airport (BOS)",
        "currency": "USD",
        "base_rate_usd": 82.0,
        "per_km_usd": 3.70,
        "tax_rate_pct": 6.25,
        "domain": "beaconhill-limo.com",
        "inbound_email": "rides@beaconhill-limo.com",
        "contact_phone": "+16175550199",
        "drivers": [],
        "branding": {
            "company_tagline": "Boston Luxury Chauffeurs",
            "primary_color": "#1E3A8A",
            "accent_color": "#F59E0B",
            "domain": "beaconhill-limo.com",
            "contact_phone": "+16175550199",
            "office_address": "100 State St, Boston, MA",
            "logo_url": "/assets/boston_logo.png"
        }
    }
    r_spin = client.post("/api/v1/vendor-cell/spin-up", json=spin_payload)
    assert r_spin.status_code == 200
    assert r_spin.json()["vendor_id"] == "vendor_boston_beacon"

    # 2. Inbound Email Parse API
    email_payload = {
        "sender_email": "concierge@harvard.edu",
        "subject": "Dean Transfer from Logan Airport",
        "body": "Passenger: Dean Lawrence Summers, phone: +16175550999. Pickup: Boston Logan Airport (BOS) Terminal B. Dropoff: Harvard Yard, Cambridge. Flight: DL 492."
    }
    r_parse = client.post("/api/v1/vendor-cell/vendor_boston_beacon/email/inbound-parse", json=email_payload)
    assert r_parse.status_code == 200
    assert r_parse.json()["vendor_id"] == "vendor_boston_beacon"
    assert "Summers" in r_parse.json()["parsed_passenger_name"]

    # 3. Outbound Email Dispatch API
    outbound_payload = {
        "recipient_email": "lawrence@harvard.edu",
        "booking_id": "bk_bos_001",
        "passenger_name": "Dean Lawrence Summers",
        "pickup_address": "Boston Logan Airport (BOS) Terminal B",
        "dropoff_address": "Harvard Yard, Cambridge",
        "vehicle_class": "FIRST_CLASS",
        "amount_usd": 135.50,
        "driver_name": "Patrick O'Malley",
        "driver_phone": "+16175550888",
        "vehicle_info": "Mercedes-Benz S580",
        "company_name": "Beacon Hill Executive Limo"
    }
    r_dispatch = client.post("/api/v1/vendor-cell/vendor_boston_beacon/email/outbound-dispatch", json=outbound_payload)
    assert r_dispatch.status_code == 200
    assert r_dispatch.json()["status"] == "DELIVERED"

    # 4. Portal Config API
    r_portal = client.get("/api/v1/vendor-cell/vendor_boston_beacon/portal-config")
    assert r_portal.status_code == 200
    assert r_portal.json()["vendor_id"] == "vendor_boston_beacon"
    assert r_portal.json()["branding"]["domain"] == "beaconhill-limo.com"

    # 5. Affiliate Farm Out API
    farm_payload = {
        "performing_vendor_id": "vendor_anb_philly",
        "passenger_name": "Arthur Pendelton",
        "passenger_phone": "+16175550777",
        "pickup_address": "Philadelphia International Airport (PHL) Terminal A",
        "dropoff_address": "The Bellevue Hotel Philadelphia",
        "distance_km": 17.5,
        "vehicle_class": "FIRST_CLASS"
    }
    r_farm = client.post("/api/v1/vendor-cell/vendor_boston_beacon/affiliate/farm-out", json=farm_payload)
    assert r_farm.status_code == 200
    assert r_farm.json()["originator_vendor_id"] == "vendor_boston_beacon"
    assert r_farm.json()["performing_vendor_id"] == "vendor_anb_philly"
