"""
Location-Aware Dynamic Tax, Airport Concession Fee & Regulatory Surcharge Engine.
Computes deterministic, compliant tax breakdowns based on exact pickup and dropoff jurisdictions.
Supports:
- New York City (NYC Sales Tax 8.875% + 3.0% Black Car Fund + $2.75 Congestion + $5.00 Port Auth)
- Philadelphia (PA Sales Tax 8.0% + $3.50 PHL Airport Curbside Fee + $1.50 PPA Fee)
- Boston (MA Sales Tax 6.25% + $3.25 Massport Logan Fee + $0.20 Transit Infra)
- London UK (UK Standard VAT 20.0% + £15.00 TfL Congestion + £5.00 LHR Drop-off)
- Configurable fallback for international and custom vendor zones.
"""

from typing import Dict, Any, List, Optional
from decimal import Decimal
from pydantic import BaseModel


class LocationTaxBreakdown(BaseModel):
    jurisdiction_code: str
    jurisdiction_name: str
    currency: str
    base_tariff: Decimal
    mileage_fare: Decimal
    meet_and_greet: Decimal
    tolls_and_parking: Decimal
    subtotal: Decimal
    regulatory_surcharges: List[Dict[str, Any]]
    total_regulatory_surcharges: Decimal
    taxable_amount: Decimal
    tax_rate_pct: Decimal
    tax_name: str
    tax_amount: Decimal
    gratuity_pct: Decimal
    gratuity_amount: Decimal
    all_inclusive_total: Decimal


class LocationTaxService:
    """Calculates granular, legally compliant tax and surcharge ledgers."""

    @staticmethod
    def calculate_tax_breakdown(
        pickup_address: str,
        dropoff_address: str,
        base_tariff: Decimal,
        distance_miles: float,
        mileage_rate: Decimal = Decimal("4.25"),
        meet_and_greet: Decimal = Decimal("0.00"),
        tolls: Decimal = Decimal("15.00"),
        gratuity_pct: Decimal = Decimal("20.0")
    ) -> LocationTaxBreakdown:
        pickup_lower = pickup_address.lower()
        dropoff_lower = dropoff_address.lower()
        
        mileage_fare = (Decimal(str(distance_miles)) * mileage_rate).quantize(Decimal("0.01"))
        subtotal = base_tariff + mileage_fare + meet_and_greet + tolls
        
        surcharges: List[Dict[str, Any]] = []
        total_surcharges = Decimal("0.00")
        
        # 1. New York City / Tri-State Area
        if "new york" in pickup_lower or "nyc" in pickup_lower or "jfk" in pickup_lower or "lga" in pickup_lower or "manhattan" in pickup_lower:
            jurisdiction_code = "US-NY-NYC"
            jurisdiction_name = "New York State & New York City"
            currency = "USD"
            tax_rate = Decimal("8.875")
            tax_name = "NY Combined Sales Tax (8.875%)"
            
            # NY Black Car Fund (3.0% mandatory workers compensation surcharge)
            bcf_fee = (subtotal * Decimal("0.03")).quantize(Decimal("0.01"))
            surcharges.append({"name": "NY Black Car Fund (Workers' Comp)", "rate": "3.0%", "amount": float(bcf_fee)})
            total_surcharges += bcf_fee
            
            # Manhattan Congestion Surcharge
            if "manhattan" in pickup_lower or "manhattan" in dropoff_lower or "plaza" in dropoff_lower or "wall st" in dropoff_lower:
                congestion_fee = Decimal("2.75")
                surcharges.append({"name": "NY Congestion Relief Zone Surcharge", "amount": float(congestion_fee)})
                total_surcharges += congestion_fee
                
            # Airport Port Authority Gate Fee (JFK / LGA)
            if "jfk" in pickup_lower or "lga" in pickup_lower or "kennedy" in pickup_lower or "la guardia" in pickup_lower:
                port_fee = Decimal("5.00")
                surcharges.append({"name": "Port Authority NY/NJ Airport Access Fee", "amount": float(port_fee)})
                total_surcharges += port_fee

        # 2. Philadelphia / Pennsylvania
        elif "philadelphia" in pickup_lower or "phl" in pickup_lower or "pa " in pickup_lower or "pennsylvania" in pickup_lower or "phl" in dropoff_lower or "philadelphia" in dropoff_lower:
            jurisdiction_code = "US-PA-PHL"
            jurisdiction_name = "Commonwealth of Pennsylvania & Philadelphia"
            currency = "USD"
            tax_rate = Decimal("8.00")
            tax_name = "PA & Philadelphia Local Sales Tax (8.0%)"
            
            if "phl" in pickup_lower or "airport" in pickup_lower or "phl" in dropoff_lower or "airport" in dropoff_lower:
                phl_fee = Decimal("3.50")
                surcharges.append({"name": "PHL Airport Ground Concession Fee", "amount": float(phl_fee)})
                total_surcharges += phl_fee
                
            ppa_fee = Decimal("1.50")
            surcharges.append({"name": "Philadelphia Parking Authority (PPA) Assessment", "amount": float(ppa_fee)})
            total_surcharges += ppa_fee

        # 3. Boston / Massachusetts
        elif "boston" in pickup_lower or "bos" in pickup_lower or "logan" in pickup_lower or "massachusetts" in pickup_lower or "boston" in dropoff_lower or "bos" in dropoff_lower:
            jurisdiction_code = "US-MA-BOS"
            jurisdiction_name = "Commonwealth of Massachusetts"
            currency = "USD"
            tax_rate = Decimal("6.25")
            tax_name = "MA State Sales Tax (6.25%)"
            
            if "logan" in pickup_lower or "bos" in pickup_lower or "logan" in dropoff_lower or "bos" in dropoff_lower:
                massport_fee = Decimal("3.25")
                surcharges.append({"name": "Massport Logan Airport Access Charge", "amount": float(massport_fee)})
                total_surcharges += massport_fee
                
            infra_fee = Decimal("0.20")
            surcharges.append({"name": "MA Transportation Infrastructure Fund", "amount": float(infra_fee)})
            total_surcharges += infra_fee

        # 4. London / United Kingdom
        elif "london" in pickup_lower or "heathrow" in pickup_lower or "lhr" in pickup_lower or "gatwick" in pickup_lower or "mayfair" in pickup_lower or "london" in dropoff_lower:
            jurisdiction_code = "GB-ENG-LON"
            jurisdiction_name = "Greater London & United Kingdom"
            currency = "GBP"
            tax_rate = Decimal("20.00")
            tax_name = "UK Value Added Tax (VAT 20.0%)"
            
            if "heathrow" in pickup_lower or "lhr" in pickup_lower or "heathrow" in dropoff_lower or "lhr" in dropoff_lower:
                lhr_fee = Decimal("5.00")
                surcharges.append({"name": "Heathrow Airport Terminal Drop-Off/Pickup Charge", "amount": float(lhr_fee)})
                total_surcharges += lhr_fee
                
            if "mayfair" in dropoff_lower or "savoy" in dropoff_lower or "westminster" in dropoff_lower or "london" in dropoff_lower:
                tfl_fee = Decimal("15.00")
                surcharges.append({"name": "Transport for London (TfL) Central Congestion Charge", "amount": float(tfl_fee)})
                total_surcharges += tfl_fee

        # 5. Default General Jurisdiction
        else:
            jurisdiction_code = "DEFAULT-US"
            jurisdiction_name = "Standard Regional Jurisdiction"
            currency = "USD"
            tax_rate = Decimal("7.00")
            tax_name = "Regional Transportation Sales Tax (7.0%)"

        taxable_amount = subtotal + total_surcharges
        tax_amount = (taxable_amount * (tax_rate / Decimal("100.0"))).quantize(Decimal("0.01"))
        gratuity_amount = (subtotal * (gratuity_pct / Decimal("100.0"))).quantize(Decimal("0.01"))
        all_inclusive_total = subtotal + total_surcharges + tax_amount + gratuity_amount

        return LocationTaxBreakdown(
            jurisdiction_code=jurisdiction_code,
            jurisdiction_name=jurisdiction_name,
            currency=currency,
            base_tariff=base_tariff,
            mileage_fare=mileage_fare,
            meet_and_greet=meet_and_greet,
            tolls_and_parking=tolls,
            subtotal=subtotal,
            regulatory_surcharges=surcharges,
            total_regulatory_surcharges=total_surcharges,
            taxable_amount=taxable_amount,
            tax_rate_pct=tax_rate,
            tax_name=tax_name,
            tax_amount=tax_amount,
            gratuity_pct=gratuity_pct,
            gratuity_amount=gratuity_amount,
            all_inclusive_total=all_inclusive_total
        )
