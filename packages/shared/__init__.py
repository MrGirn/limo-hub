# Universal Shared Domain Models, Enums & Security Primitives
from packages.shared.domain_models import (
    VehicleClass, LegMode, DistanceUnit, TripStatus, LegPriceStatus,
    SourcingOpportunityStatus, GlobalUserRole, VendorUserRole, UserSession,
    MasterItinerary, ItineraryLeg, OutboundVendorRFP
)
from packages.shared.security_primitives import (
    hash_password, verify_password, create_access_token, decode_access_token,
    get_current_user, require_permission, require_vendor_scope
)
