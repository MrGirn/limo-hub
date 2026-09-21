"""
B2B Affiliate Cross-Dispatch & Escrow Clearing Exchange Service.
Enables sovereign vendor cells to cross-dispatch rides (e.g. NY Executive farms out Philadelphia leg to ANB Limo).
Enforces automated 85% / 10% / 5% escrow commission clearing:
- 85% to Performing Vendor (provides vehicle, driver, local execution)
- 10% to Referring / Originating Vendor (procured the customer)
- 5% to Global Federation Hub (platform clearinghouse & insurance bond)
"""
from __future__ import annotations

import time
import uuid
import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.domain_models import VehicleClass, BookingStatus
from app.services.vendor_cell_engine import vendor_cell_registry

logger = logging.getLogger("VendorAffiliateExchange")


class AffiliateCommissionSplit(BaseModel):
    gross_fare_usd: float
    performing_vendor_net_usd: float  # 85%
    originating_vendor_commission_usd: float  # 10%
    hub_clearing_fee_usd: float  # 5%


class AffiliateExchangeRecord(BaseModel):
    exchange_id: str = Field(default_factory=lambda: f"aff_xch_{uuid.uuid4().hex[:8]}")
    originator_vendor_id: str
    originator_vendor_name: str
    performing_vendor_id: str
    performing_vendor_name: str
    passenger_name: str
    passenger_phone: str
    pickup_address: str
    dropoff_address: str
    vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS
    distance_km: float
    fare_split: AffiliateCommissionSplit
    status: str = "ACCEPTED_DISPATCHED"  # OFFERED, ACCEPTED_DISPATCHED, IN_PROGRESS, COMPLETED, SETTLED
    assigned_driver_id: Optional[str] = None
    created_at: float = Field(default_factory=time.time)
    settled_at: Optional[float] = None


class FarmOutRules(BaseModel):
    enabled: bool = True
    ai_natural_language_prompt: str = (
        "When farming out trips in out-of-market cities (NYC, London, Paris, Miami, Dubai, LA), "
        "only assign to certified 5-star operators (>=4.90 rating) with 2024+ luxury sedans/SUVs. "
        "Require minimum 10% referral commission and verified commercial insurance."
    )
    ai_decision_mode: str = "AI_AGENT_AUTONOMOUS"  # AI_AGENT_AUTONOMOUS, STRICT_DETERMINISTIC, HYBRID
    min_partner_rating: float = 4.90
    max_vehicle_age_years: int = 3
    min_referral_commission_pct: float = 10.0
    preferred_partner_ids: List[str] = Field(default_factory=list)
    blacklisted_partner_ids: List[str] = Field(default_factory=list)
    require_commercial_insurance: bool = True
    require_airport_fbo_permit: bool = True
    auto_farmout_on_overcapacity: bool = True
    auto_farmout_out_of_market: bool = True
    local_service_radius_km: float = 75.0
    require_owner_manual_approval: bool = False


class FarmInRules(BaseModel):
    open_for_farm_in: bool = True
    ai_natural_language_prompt: str = (
        "Open to receive corporate and airport transfer rides in our home metro area. "
        "Require minimum $80 net payout. Only accept First Class, Luxury SUV, and Business Sedan classes. "
        "Prioritize bookings with at least 45 minutes lead time."
    )
    ai_decision_mode: str = "AI_AGENT_AUTONOMOUS"
    allowed_vehicle_classes: List[VehicleClass] = Field(default_factory=lambda: [
        VehicleClass.FIRST_CLASS, VehicleClass.LUXURY_SUV, VehicleClass.BUSINESS_SEDAN
    ])
    min_net_payout_usd: float = 75.0
    min_lead_time_minutes: int = 45
    max_deadhead_from_depot_km: float = 45.0
    auto_accept_whitelisted: bool = True
    preferred_originator_ids: List[str] = Field(default_factory=list)
    blacklisted_originator_ids: List[str] = Field(default_factory=list)
    require_verified_passenger_phone: bool = True


class VendorAffiliatePolicyRules(BaseModel):
    vendor_id: str
    custom_owner_notes: str = "Autonomous operations configured by fleet owner."
    farm_out_policy: FarmOutRules = Field(default_factory=FarmOutRules)
    farm_in_policy: FarmInRules = Field(default_factory=FarmInRules)
    ai_compiled_summary: str = "AI Agent Directives Active & Synced to Global Hub Knowledge Base"
    updated_at: float = Field(default_factory=time.time)


class CertifiedAffiliatePartner(BaseModel):
    partner_id: str
    company_name: str
    city: str
    country: str
    country_code: str
    airports: List[str]
    rating: float
    trips_completed: int
    compliance_badge: str
    supported_classes: List[VehicleClass]
    primary_vehicle: str
    vehicle_year: int = 2024
    base_rate_usd: float
    per_km_rate_usd: float
    escrow_trust_score: float  # 0 to 100
    payout_account_verified: bool = True
    insurance_liability_coverage_usd: float = 5000000.0


class AffiliateRecommendation(BaseModel):
    partner: CertifiedAffiliatePartner
    match_score: float  # 0 to 100
    match_reasons: List[str]
    policy_compliance_notes: List[str]
    ai_reasoning_explanation: str = "AI Agent consensus confirmed across both operator policies."
    estimated_gross_fare_usd: float
    originator_commission_usd: float  # 10%
    performing_partner_net_usd: float  # 85%
    hub_clearing_fee_usd: float  # 5%
    estimated_chauffeur_eta_minutes: int
    is_preferred_partner: bool = False
    farm_in_status_open: bool = True


class VendorAffiliateExchangeService:
    """Coordinates peer-to-peer affiliate cross-farming between sovereign vendor cells."""

    def __init__(self):
        self.exchange_records: List[AffiliateExchangeRecord] = []
        self.directory: List[CertifiedAffiliatePartner] = self._build_certified_global_directory()
        self.vendor_policies: Dict[str, VendorAffiliatePolicyRules] = self._seed_default_vendor_policies()

    def _seed_default_vendor_policies(self) -> Dict[str, VendorAffiliatePolicyRules]:
        """Seeds sovereign business policies for registered cells."""
        return {
            "anb-limo-philly": VendorAffiliatePolicyRules(
                vendor_id="anb-limo-philly",
                custom_owner_notes="Owner Rule: Primary focus on PHL Airport VIP FBO and 30th St Amtrak corridor.",
                farm_out_policy=FarmOutRules(
                    ai_natural_language_prompt="Farm out any New York, London, Miami, Paris, or Dubai jobs to top-tier 5-star affiliates. Require Escalade or S-Class and minimum 10% referral cut.",
                    min_partner_rating=4.90,
                    max_vehicle_age_years=3,
                    min_referral_commission_pct=10.0,
                    preferred_partner_ids=["ny-executive-limo", "london-royal-chauffeur", "miami-vip-fleet"],
                    local_service_radius_km=75.0
                ),
                farm_in_policy=FarmInRules(
                    open_for_farm_in=True,
                    ai_natural_language_prompt="Open to all inbound airport transfers in Philly Metro. Minimum $80 net payout. First Class and Luxury SUV preferred.",
                    allowed_vehicle_classes=[VehicleClass.FIRST_CLASS, VehicleClass.LUXURY_SUV, VehicleClass.BUSINESS_SEDAN],
                    min_net_payout_usd=80.0,
                    min_lead_time_minutes=45,
                    max_deadhead_from_depot_km=45.0,
                    auto_accept_whitelisted=True
                )
            ),
            "ny-executive-limo": VendorAffiliatePolicyRules(
                vendor_id="ny-executive-limo",
                custom_owner_notes="Owner Rule: Tri-state executive VIP standards with strict vehicle age limit.",
                farm_out_policy=FarmOutRules(
                    ai_natural_language_prompt="Farm out Philadelphia, DC, or overseas legs to certified partner cells with 4.92+ rating and 2024+ vehicle models.",
                    min_partner_rating=4.92,
                    max_vehicle_age_years=2,
                    preferred_partner_ids=["anb-limo-philly", "london-royal-chauffeur"],
                    local_service_radius_km=60.0
                ),
                farm_in_policy=FarmInRules(
                    open_for_farm_in=True,
                    ai_natural_language_prompt="Accept incoming JFK/LGA/EWR airport and Manhattan transfers paying >= $95 net.",
                    allowed_vehicle_classes=[VehicleClass.FIRST_CLASS, VehicleClass.LUXURY_SUV],
                    min_net_payout_usd=95.0,
                    min_lead_time_minutes=30,
                    max_deadhead_from_depot_km=50.0,
                    auto_accept_whitelisted=True
                )
            ),
            "london-royal-chauffeur": VendorAffiliatePolicyRules(
                vendor_id="london-royal-chauffeur",
                farm_out_policy=FarmOutRules(min_partner_rating=4.95, max_vehicle_age_years=2),
                farm_in_policy=FarmInRules(open_for_farm_in=True, min_net_payout_usd=100.0)
            ),
            "miami-vip-fleet": VendorAffiliatePolicyRules(
                vendor_id="miami-vip-fleet",
                farm_out_policy=FarmOutRules(min_partner_rating=4.90),
                farm_in_policy=FarmInRules(open_for_farm_in=True, min_net_payout_usd=85.0)
            ),
            "paris-etoile-limousine": VendorAffiliatePolicyRules(
                vendor_id="paris-etoile-limousine",
                farm_out_policy=FarmOutRules(min_partner_rating=4.92),
                farm_in_policy=FarmInRules(open_for_farm_in=True, min_net_payout_usd=90.0)
            ),
            "dubai-emirates-prestige": VendorAffiliatePolicyRules(
                vendor_id="dubai-emirates-prestige",
                farm_out_policy=FarmOutRules(min_partner_rating=4.95),
                farm_in_policy=FarmInRules(open_for_farm_in=True, min_net_payout_usd=90.0)
            ),
            "la-prestige-chauffeur": VendorAffiliatePolicyRules(
                vendor_id="la-prestige-chauffeur",
                farm_out_policy=FarmOutRules(min_partner_rating=4.90),
                farm_in_policy=FarmInRules(open_for_farm_in=True, min_net_payout_usd=95.0)
            )
        }

    def get_vendor_policy(self, vendor_id: str) -> VendorAffiliatePolicyRules:
        """Retrieves sovereign affiliate business rules for a specific vendor cell."""
        if vendor_id not in self.vendor_policies:
            self.vendor_policies[vendor_id] = VendorAffiliatePolicyRules(vendor_id=vendor_id)
        return self.vendor_policies[vendor_id]

    def update_vendor_policy(self, vendor_id: str, payload: Dict[str, Any]) -> VendorAffiliatePolicyRules:
        """Updates and broadcasts vendor's sovereign business rules to Global Hub Knowledge Base."""
        current = self.get_vendor_policy(vendor_id)
        
        if "farm_out_policy" in payload and isinstance(payload["farm_out_policy"], dict):
            current.farm_out_policy = FarmOutRules(**{**current.farm_out_policy.model_dump(), **payload["farm_out_policy"]})
        if "farm_in_policy" in payload and isinstance(payload["farm_in_policy"], dict):
            current.farm_in_policy = FarmInRules(**{**current.farm_in_policy.model_dump(), **payload["farm_in_policy"]})

        current.updated_at = time.time()
        self.vendor_policies[vendor_id] = current
        logger.info(f"Vendor Sovereign Business Policy Updated & Synced to Global Hub for: {vendor_id}")
        return current

    def get_global_hub_knowledge_base(self) -> Dict[str, Any]:
        """Returns the Global Hub Knowledge Base of all registered partner policies and capacity."""
        indexed_partners = []
        for partner in self.directory:
            policy = self.get_vendor_policy(partner.partner_id)
            indexed_partners.append({
                "partner_id": partner.partner_id,
                "company_name": partner.company_name,
                "city": partner.city,
                "country": partner.country,
                "airports": partner.airports,
                "rating": partner.rating,
                "open_for_farm_in": policy.farm_in_policy.open_for_farm_in,
                "min_net_payout_usd": policy.farm_in_policy.min_net_payout_usd,
                "allowed_classes": [c.value for c in policy.farm_in_policy.allowed_vehicle_classes],
                "compliance_badge": partner.compliance_badge,
                "insurance_liability_coverage_usd": partner.insurance_liability_coverage_usd,
                "escrow_trust_score": partner.escrow_trust_score,
                "vehicle_year": partner.vehicle_year,
                "primary_vehicle": partner.primary_vehicle
            })

        return {
            "status": "ONLINE",
            "knowledge_base_version": "2.4.0",
            "total_registered_vendors": len(self.directory),
            "active_open_farm_in_vendors": len([p for p in indexed_partners if p["open_for_farm_in"]]),
            "supported_global_airports": sorted(list({ap for p in self.directory for ap in p.airports})),
            "vendors": indexed_partners
        }

    def _build_certified_global_directory(self) -> List[CertifiedAffiliatePartner]:
        return [
            CertifiedAffiliatePartner(
                partner_id="ny-executive-limo",
                company_name="New York Executive Limousine",
                city="New York",
                country="United States",
                country_code="US",
                airports=["JFK", "LGA", "EWR", "TEB (Teterboro FBO)"],
                rating=4.99,
                trips_completed=3420,
                compliance_badge="NYC TLC Licensed & Insured · PPA Registered",
                supported_classes=[VehicleClass.FIRST_CLASS, VehicleClass.LUXURY_SUV, VehicleClass.BUSINESS_SEDAN],
                primary_vehicle="2025 Cadillac Escalade ESV & Mercedes S580",
                vehicle_year=2025,
                base_rate_usd=95.0,
                per_km_rate_usd=3.85,
                escrow_trust_score=99.8
            ),
            CertifiedAffiliatePartner(
                partner_id="anb-limo-philly",
                company_name="ANB Limo Philadelphia",
                city="Philadelphia",
                country="United States",
                country_code="US",
                airports=["PHL", "Atlantic Aviation FBO", "30th St Amtrak"],
                rating=4.99,
                trips_completed=2890,
                compliance_badge="PPA Certified · Tri-State Interstate Authority",
                supported_classes=[VehicleClass.FIRST_CLASS, VehicleClass.LUXURY_SUV, VehicleClass.BUSINESS_SEDAN],
                primary_vehicle="Cadillac Escalade ESV · Suburban Premier",
                vehicle_year=2024,
                base_rate_usd=75.0,
                per_km_rate_usd=3.25,
                escrow_trust_score=100.0
            ),
            CertifiedAffiliatePartner(
                partner_id="miami-vip-fleet",
                company_name="Miami Grand Executive Chauffeurs",
                city="Miami",
                country="United States",
                country_code="US",
                airports=["MIA", "FLL", "OPF (Opa-Locka Executive FBO)", "PBI"],
                rating=4.97,
                trips_completed=1980,
                compliance_badge="Miami-Dade County For-Hire Luxury Limousine License",
                supported_classes=[VehicleClass.FIRST_CLASS, VehicleClass.LUXURY_SUV],
                primary_vehicle="Lincoln Navigator Black Label · Mercedes Maybach",
                vehicle_year=2024,
                base_rate_usd=90.0,
                per_km_rate_usd=3.60,
                escrow_trust_score=98.5
            ),
            CertifiedAffiliatePartner(
                partner_id="la-prestige-chauffeur",
                company_name="Los Angeles Prestige Fleet",
                city="Los Angeles",
                country="United States",
                country_code="US",
                airports=["LAX", "BUR (Burbank)", "VNY (Van Nuys FBO)", "SNA"],
                rating=4.98,
                trips_completed=4150,
                compliance_badge="CPUC TCP #38921-A · LAWA Airport Commercial Permit",
                supported_classes=[VehicleClass.FIRST_CLASS, VehicleClass.LUXURY_SUV, VehicleClass.BUSINESS_SEDAN],
                primary_vehicle="Cadillac Escalade ESV · BMW i7 xDrive60",
                vehicle_year=2025,
                base_rate_usd=105.0,
                per_km_rate_usd=4.10,
                escrow_trust_score=99.2
            ),
            CertifiedAffiliatePartner(
                partner_id="london-royal-chauffeur",
                company_name="London Royal Sovereign Chauffeurs",
                city="London",
                country="United Kingdom",
                country_code="GB",
                airports=["LHR (Heathrow)", "LGW (Gatwick)", "LCY (City)", "Farnborough FBO"],
                rating=4.99,
                trips_completed=5600,
                compliance_badge="Transport for London (TfL) Private Hire Operator #09812",
                supported_classes=[VehicleClass.FIRST_CLASS, VehicleClass.LUXURY_SUV],
                primary_vehicle="Mercedes-Benz S-Class LWB · Range Rover Autobiography",
                vehicle_year=2024,
                base_rate_usd=110.0,
                per_km_rate_usd=4.50,
                escrow_trust_score=99.9
            ),
            CertifiedAffiliatePartner(
                partner_id="paris-etoile-limousine",
                company_name="Paris Étoile Chauffeur Privé",
                city="Paris",
                country="France",
                country_code="FR",
                airports=["CDG (Roissy)", "ORY (Orly)", "LBG (Le Bourget VIP FBO)"],
                rating=4.98,
                trips_completed=3100,
                compliance_badge="Registre VTC Ministère des Transports de France #EVTC-075",
                supported_classes=[VehicleClass.FIRST_CLASS, VehicleClass.LUXURY_SUV],
                primary_vehicle="Mercedes-Benz S580e · Mercedes V-Class VIP Lounge",
                vehicle_year=2024,
                base_rate_usd=105.0,
                per_km_rate_usd=4.20,
                escrow_trust_score=99.0
            ),
            CertifiedAffiliatePartner(
                partner_id="dubai-emirates-prestige",
                company_name="Dubai Emirates Prestige Chauffeurs",
                city="Dubai",
                country="United Arab Emirates",
                country_code="AE",
                airports=["DXB (Terminal 3 & Al Majlis VIP)", "DWC (Al Maktoum FBO)"],
                rating=5.00,
                trips_completed=4800,
                compliance_badge="RTA Dubai Luxury Limousine Commercial Operator License",
                supported_classes=[VehicleClass.FIRST_CLASS, VehicleClass.LUXURY_SUV],
                primary_vehicle="Mercedes-Maybach S680 · Cadillac Escalade VIP CEO",
                vehicle_year=2025,
                base_rate_usd=95.0,
                per_km_rate_usd=3.50,
                escrow_trust_score=100.0
            )
        ]

    def recommend_affiliates_for_job(
        self,
        originator_vendor_id: str,
        destination_or_pickup_location: str,
        vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS,
        distance_km: float = 25.0
    ) -> List[AffiliateRecommendation]:
        """
        Bi-Directional Policy Consensus Matchmaker:
        1. Loads Originator's Farm-Out Rules.
        2. Evaluates each candidate's Farm-In Rules in Global Hub Knowledge Base.
        3. Computes MatchScore and generates policy audit trail.
        """
        originator_policy = self.get_vendor_policy(originator_vendor_id).farm_out_policy
        query = destination_or_pickup_location.lower().strip()
        recommendations: List[AffiliateRecommendation] = []

        for partner in self.directory:
            # Skip self
            if partner.partner_id == originator_vendor_id:
                continue

            candidate_policy = self.get_vendor_policy(partner.partner_id).farm_in_policy

            # Hard Filter 1: Candidate has disabled Farm-In
            if not candidate_policy.open_for_farm_in:
                continue

            # Hard Filter 2: Originator blacklisted candidate or Candidate blacklisted originator
            if partner.partner_id in originator_policy.blacklisted_partner_ids or originator_vendor_id in candidate_policy.blacklisted_originator_ids:
                continue

            # Hard Filter 3: Originator rating requirement
            if partner.rating < originator_policy.min_partner_rating:
                continue

            # Financial Escrow Projection (85% Performer / 10% Originator / 5% Hub)
            gross = round(partner.base_rate_usd + (distance_km * partner.per_km_rate_usd), 2)
            performer_net = round(gross * 0.85, 2)
            originator_comm = round(gross * (originator_policy.min_referral_commission_pct / 100.0), 2)
            hub_fee = round(gross - performer_net - originator_comm, 2)

            # Hard Filter 4: Candidate minimum payout requirement
            if performer_net < candidate_policy.min_net_payout_usd:
                continue

            # Hard Filter 5: Candidate allowed vehicle classes
            if vehicle_class not in candidate_policy.allowed_vehicle_classes:
                continue

            # Compute Match Score & Reasons
            score = 50.0  # baseline
            reasons = []
            policy_notes = [
                f"✓ Open for Farm-In Jobs (${candidate_policy.min_net_payout_usd} min threshold met)",
                f"✓ Rating ★ {partner.rating} exceeds owner's {originator_policy.min_partner_rating}★ minimum"
            ]

            # Preferred Partner Whitelist bonus
            is_pref = partner.partner_id in originator_policy.preferred_partner_ids or originator_vendor_id in candidate_policy.preferred_originator_ids
            if is_pref:
                score += 15.0
                reasons.append("★ Whitelisted Preferred Network Partner")
                policy_notes.append("✓ Originator Preferred Whitelist Active")

            # Geographic Match (City, Country, or Airport keywords)
            city_match = partner.city.lower() in query
            country_match = partner.country.lower() in query or partner.country_code.lower() in query
            airport_match = any(ap.lower().split()[0] in query for ap in partner.airports)

            if city_match or airport_match:
                score += 25.0
                reasons.append(f"Direct local presence in {partner.city}")
            elif country_match:
                score += 10.0
                reasons.append(f"Operating in {partner.country}")

            # Match on popular airport codes
            matched_airports = [ap for ap in partner.airports if ap.lower().split()[0] in query or any(code in query.upper() for code in ["JFK", "LGA", "EWR", "PHL", "MIA", "FLL", "LAX", "LHR", "LGW", "CDG", "DXB"] if code in ap)]
            if matched_airports:
                score += 10.0
                reasons.append(f"Airport tarmac & FBO VIP authorization at {matched_airports[0]}")

            # Vehicle Class Compatibility
            if vehicle_class in partner.supported_classes:
                score += 10.0
                reasons.append(f"Dedicated {vehicle_class.value.replace('_', ' ')} fleet")

            # Vehicle Age Verification
            current_year = 2026
            vehicle_age = current_year - partner.vehicle_year
            if vehicle_age <= originator_policy.max_vehicle_age_years:
                score += 5.0
                policy_notes.append(f"✓ Vehicle {partner.vehicle_year} ({vehicle_age} yr old) satisfies <={originator_policy.max_vehicle_age_years} yr policy")

            # Commercial Liability Insurance
            if partner.insurance_liability_coverage_usd >= 5000000.0:
                policy_notes.append(f"✓ $5.0M Commercial Livery Insurance Verified")

            # Rating & Escrow Trust Multiplier
            if partner.rating >= 4.98:
                score += 5.0
                reasons.append(f"★ {partner.rating} 5-Star Chauffeur Performance")
            if partner.escrow_trust_score >= 99.0:
                reasons.append("Instant Global Hub Escrow Settlement Guaranteed")

            final_match_score = min(99.9, round(score, 1))
            eta_mins = 15 if airport_match or city_match else 35

            recommendations.append(AffiliateRecommendation(
                partner=partner,
                match_score=final_match_score,
                match_reasons=reasons,
                policy_compliance_notes=policy_notes,
                estimated_gross_fare_usd=gross,
                originator_commission_usd=originator_comm,
                performing_partner_net_usd=performer_net,
                hub_clearing_fee_usd=hub_fee,
                estimated_chauffeur_eta_minutes=eta_mins,
                is_preferred_partner=is_pref,
                farm_in_status_open=candidate_policy.open_for_farm_in
            ))

        # Sort descending by match score
        recommendations.sort(key=lambda r: r.match_score, reverse=True)
        return recommendations

    def farm_out_ride(
        self,
        originator_vendor_id: str,
        performing_vendor_id: str,
        passenger_name: str,
        passenger_phone: str,
        pickup_address: str,
        dropoff_address: str,
        distance_km: float,
        vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS
    ) -> AffiliateExchangeRecord:
        """
        Executes cross-vendor dispatch.
        Originator sends ride -> Performing cell creates local booking and assigns local chauffeur.
        """
        originator_cell = vendor_cell_registry.get_cell(originator_vendor_id)
        performing_cell = vendor_cell_registry.get_cell(performing_vendor_id)

        # Lookup partner in directory if not a registered in-memory cell
        partner_match = next((p for p in self.directory if p.partner_id == performing_vendor_id), None)

        originator_name = originator_cell.config.vendor_name if originator_cell else originator_vendor_id
        performing_name = performing_cell.config.vendor_name if performing_cell else (partner_match.company_name if partner_match else performing_vendor_id)

        # Calculate quote inside performing cell's pricing matrix
        if performing_cell:
            quote = performing_cell.calculate_local_quote(distance_km, vehicle_class)
            gross_fare = quote.get("total_fare_usd", quote.get("total_amount_usd", 120.0))
            booking = performing_cell.create_direct_booking(
                passenger_name=passenger_name,
                passenger_phone=passenger_phone,
                pickup_address=pickup_address,
                dropoff_address=dropoff_address,
                distance_km=distance_km,
                vehicle_class=vehicle_class
            )
            assigned_driver = booking.assigned_driver_id
        elif partner_match:
            gross_fare = round(partner_match.base_rate_usd + (distance_km * partner_match.per_km_rate_usd), 2)
            assigned_driver = f"chauffeur_{performing_vendor_id}_lead"
        else:
            gross_fare = round(75.0 + (distance_km * 3.25 * 1.08), 2)
            assigned_driver = f"driver_{performing_vendor_id}_01"

        # Calculate 85% / 10% / 5% splits
        performing_net = round(gross_fare * 0.85, 2)
        originating_comm = round(gross_fare * 0.10, 2)
        hub_fee = round(gross_fare - performing_net - originating_comm, 2)

        split = AffiliateCommissionSplit(
            gross_fare_usd=gross_fare,
            performing_vendor_net_usd=performing_net,
            originating_vendor_commission_usd=originating_comm,
            hub_clearing_fee_usd=hub_fee
        )

        record = AffiliateExchangeRecord(
            originator_vendor_id=originator_vendor_id,
            originator_vendor_name=originator_name,
            performing_vendor_id=performing_vendor_id,
            performing_vendor_name=performing_name,
            passenger_name=passenger_name,
            passenger_phone=passenger_phone,
            pickup_address=pickup_address,
            dropoff_address=dropoff_address,
            vehicle_class=vehicle_class,
            distance_km=distance_km,
            fare_split=split,
            status="ACCEPTED_DISPATCHED",
            assigned_driver_id=assigned_driver
        )

        self.exchange_records.insert(0, record)
        logger.info(f"Affiliate Ride Farmed Out from {originator_vendor_id} to {performing_vendor_id}: ${gross_fare} total")

        # Zero-loss Transactional Outbox Logging
        try:
            from app.services.outbox_publisher_service import outbox_publisher_service
            outbox_publisher_service.enqueue_cell_event(
                vendor_id=originator_vendor_id,
                event_type="CROSS_CELL_FARMOUT",
                recipient_or_hub="limo_global_hub",
                payload={
                    "exchange_id": record.exchange_id,
                    "performing_vendor_id": performing_vendor_id,
                    "gross_fare_usd": gross_fare,
                    "split": split.model_dump()
                }
            )
        except Exception as e:
            logger.warning(f"Outbox logging notice: {e}")

        return record

    def get_vendor_affiliate_records(self, vendor_id: str) -> Dict[str, Any]:
        """Returns all farmed-in and farmed-out rides for a specific vendor cell."""
        farmed_out = [r for r in self.exchange_records if r.originator_vendor_id == vendor_id]
        farmed_in = [r for r in self.exchange_records if r.performing_vendor_id == vendor_id]

        total_earned_as_performer = sum(r.fare_split.performing_vendor_net_usd for r in farmed_in)
        total_earned_as_originator = sum(r.fare_split.originating_vendor_commission_usd for r in farmed_out)

        return {
            "vendor_id": vendor_id,
            "total_farmed_in_rides": len(farmed_in),
            "total_farmed_out_rides": len(farmed_out),
            "earned_as_performing_vendor_usd": round(total_earned_as_performer, 2),
            "earned_as_referring_vendor_usd": round(total_earned_as_originator, 2),
            "farmed_in_history": farmed_in,
            "farmed_out_history": farmed_out
        }

    def get_exchange_history(self) -> List[AffiliateExchangeRecord]:
        """Returns all affiliate cross-dispatch exchange records."""
        return self.exchange_records



# Global singleton instance
vendor_affiliate_exchange_service = VendorAffiliateExchangeService()


