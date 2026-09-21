import pytest
from decimal import Decimal
from app.services.google_maps_service import GoogleMapsService
from app.services.pricing_service import resolve_transit_info, TransitType


def test_dynamic_places_autocomplete():
    """Verify dynamic autocomplete resolution for international airports & landmarks."""
    # Test airport autocomplete
    results = GoogleMapsService.autocomplete_places("JFK")
    assert len(results) > 0
    first = results[0]
    assert "category" in first
    assert first["category"] in ("AIRPORT", "GENERAL")
    if first["category"] == "AIRPORT":
        assert first["airport_code"] == "JFK"

    # Test London Heathrow
    lhr_results = GoogleMapsService.autocomplete_places("Heathrow Airport", country_code="GB")
    assert len(lhr_results) > 0
    assert any("heathrow" in r["description"].lower() or "heathrow" in r["main_text"].lower() for r in lhr_results)


def test_dynamic_address_geocoding_and_caching():
    """Verify dynamic geocoding returns coordinates, place category, and caches results."""
    addr = "Chicago O'Hare International Airport (ORD), Chicago, IL, USA"
    geo1 = GoogleMapsService.validate_and_geocode_address(addr)
    assert geo1["valid"] is True
    assert "lat" in geo1 and "lng" in geo1
    assert geo1["category"] == "AIRPORT"

    # Second call should hit the dynamic in-memory cache
    geo2 = GoogleMapsService.validate_and_geocode_address(addr)
    assert geo2["valid"] is True
    assert geo2["lat"] == geo1["lat"]
    assert geo2["lng"] == geo1["lng"]


def test_dynamic_train_station_classification():
    """Verify railway and train stations are dynamically categorized as TRAIN_STATION."""
    station_addr = "William H. Gray III 30th Street Station (Amtrak), Philadelphia, PA"
    geo = GoogleMapsService.validate_and_geocode_address(station_addr)
    assert geo["valid"] is True
    assert geo["category"] == "TRAIN_STATION"


def test_dynamic_flight_transit_resolver():
    """Verify dynamic flight resolution across multiple international carriers."""
    # British Airways BA 178
    ba = resolve_transit_info("BA 178", "")
    assert ba is not None
    assert ba.transit_type == TransitType.FLIGHT
    assert "British Airways" in ba.carrier_name
    assert ba.identifier == "BA 178"

    # Emirates EK 201
    ek = resolve_transit_info("EK 201", "")
    assert ek is not None
    assert ek.transit_type == TransitType.FLIGHT
    assert "Emirates" in ek.carrier_name
    assert ek.identifier == "EK 201"

    # Delta DL 1984
    dl = resolve_transit_info("DL 1984", "")
    assert dl is not None
    assert dl.transit_type == TransitType.FLIGHT
    assert "Delta" in dl.carrier_name


def test_dynamic_rail_transit_resolver():
    """Verify dynamic train transit resolution for Acela, Eurostar, and Amtrak."""
    acela = resolve_transit_info("ACELA 2150", "")
    assert acela is not None
    assert acela.transit_type == TransitType.TRAIN
    assert "Amtrak" in acela.carrier_name

    eurostar = resolve_transit_info("EUROSTAR 9012", "")
    assert eurostar is not None
    assert eurostar.transit_type == TransitType.TRAIN
    assert "Eurostar" in eurostar.carrier_name


def test_dynamic_address_fallback_transit_resolver():
    """Verify address-based transit resolution dynamically categorizes airports and train stations."""
    res_air = resolve_transit_info(None, "Frankfurt Airport Terminal 1 (FRA), Germany")
    assert res_air is not None
    assert res_air.transit_type == TransitType.FLIGHT
    assert "Airport" in res_air.station_or_airport or "FRA" in res_air.identifier

    res_train = resolve_transit_info(None, "Penn Station Amtrak VIP Ramp, New York, NY")
    assert res_train is not None
    assert res_train.transit_type == TransitType.TRAIN
