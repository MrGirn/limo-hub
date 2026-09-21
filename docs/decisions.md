# Architecture & Design Decisions: Global Autonomous Limo Platform

## Decision 1: Arbitrary $N$-Leg Multi-Modal Global Itinerary Engine
- **Context:** Luxury travel often involves multi-modal journeys across cities and countries (e.g. Chauffeur in NYC $\rightarrow$ Flight BA178 $\rightarrow$ Chauffeur in London $\rightarrow$ Eurostar $\rightarrow$ Chauffeur in Paris).
- **Decision:** Implemented `MasterItinerary` with recursive ordered `ItineraryLeg` records supporting `CHAUFFEUR_RIDE`, `FLIGHT`, `TRAIN`, `HELICOPTER_TRANSFER`, and `CROSS_BORDER_DRIVE`.
- **Location:** `app/services/itinerary_engine.py`

## Decision 2: Dual-Mode Vendor Operating Architecture
- **Context:** Independent limo fleets need their own private operating software without data leakage, while also wanting to participate in international affiliate jobs.
- **Decision:** Implemented `STANDALONE_PRIVATE` mode (completely isolated local CRM and fleet) vs `GLOBAL_NETWORK_FEDERATED` mode (automatic referral of outbound legs for 10% commission, inbound job reception for 85% payout, and 5% platform guarantee fee).
- **Location:** `app/services/vendor_network_service.py`

## Decision 3: Real-Time Omnichannel Voice Call Intake & Conversational Booking
- **Context:** High-net-worth customers and corporate executive assistants frequently book via telephone calls.
- **Decision:** Built sub-second conversational voice quoting with immediate Stripe pre-authorization hold and instant SMS dispatch upon verbal confirmation on the call.
- **Location:** `app/services/vendor_network_service.py` & `app/services/omnichannel_intake_service.py`

## Decision 4: Google Maps Platform Global Autocomplete & Auto-Fill
- **Context:** Booking input fields need intelligent worldwide auto-fill for international airports (JFK, LHR, CDG, HND, DXB), luxury hotels, rail stations, and street addresses.
- **Decision:** Created global debounced `AddressAutocompleteInput.tsx` backed by `GoogleMapsService.autocomplete_places` without restrictive single-country boundary filters.
- **Location:** `frontend/src/components/AddressAutocompleteInput.tsx` & `app/services/google_maps_service.py`

## Decision 5: Autonomous Regulatory Vetting with CrewAI
- **Context:** Onboarding vendors across NYC (TLC), California (CPUC), London (TfL), and Tokyo requires strict compliance auditing.
- **Decision:** Autonomous CrewAI Dossier agent verifies licenses, minimum $5M commercial liability coverage, vehicle inspection limits, and criminal background certification.
- **Location:** `app/services/crewai_vendor_dossier_service.py`

## Decision 6: Single-Tenant Autonomous Vendor-in-a-Box Cellular Architecture
- **Context:** Each vendor needs complete business autonomy to run locally with their own isolated database partition, private pricing matrix, dynamic driver/fleet management from DB/APIs, and circuit-breaker blast-radius isolation from external hub outages.
- **Decision:** Built the `VendorCellEngine` and declarative `VendorSpinupService` to spin up turnkey sovereign vendor instances (such as ANB Limo in Philadelphia, T-1) via declarative YAML/JSON configurations (`config/vendor_definitions/`).
- **Location:** `app/services/vendor_cell_engine.py` & `app/services/vendor_spinup_service.py`

## Decision 7: Dedicated Inbound/Outbound Email Gateway & B2B Affiliate Exchange
- **Context:** Limo businesses rely on email RFQs from corporate travel desks and need branded confirmations, while cooperating with peer vendors for out-of-market rides without losing customer trust.
- **Decision:** Implemented `VendorEmailGatewayService` for NLP email parsing and DKIM/SPF branded dispatches, alongside `VendorAffiliateExchangeService` with automated 85% (performing) / 10% (originating) / 5% (clearing) escrow settlements.
- **Location:** `app/services/vendor_email_gateway_service.py` & `app/services/vendor_affiliate_exchange_service.py`

