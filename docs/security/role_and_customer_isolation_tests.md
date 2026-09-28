# Role and Customer Isolation Test Results

## 1. Role-Based Access Control (RBAC) Matrix

| Resource / Action | Anonymous / Guest | Customer (`ROLE_CUSTOMER`) | Chauffeur (`ROLE_CHAUFFEUR`) | Dispatcher (`ROLE_DISPATCHER`) | Vendor Admin (`ROLE_VENDOR_ADMIN`) | Super Admin (`ROLE_SUPER_ADMIN`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Calculate Price Quote** | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| **Book Itinerary (Public/Guest)** | ALLOW | ALLOW | DENY | DENY | DENY | DENY |
| **View Customer Trip History** | DENY | ALLOW (Own ID) | DENY | DENY | ALLOW (Own Vendor) | ALLOW (Global) |
| **Chauffeur Shift Clock In/Out** | DENY | DENY | ALLOW (Own ID) | ALLOW (Vendor Drivers) | ALLOW (Vendor Drivers) | ALLOW (Global) |
| **Driver Location GPS Broadcast** | DENY | DENY | ALLOW (Assigned Trip) | DENY | DENY | DENY |
| **Modify Vendor Pricing Rules** | DENY | DENY | DENY | DENY | ALLOW (Own Vendor) | ALLOW (Global) |
| **View Vendor Financial Settlements**| DENY | DENY | DENY | DENY | ALLOW (Own Vendor) | ALLOW (Global) |
| **Cross-Vendor Affiliate Farm-Out** | DENY | DENY | DENY | ALLOW | ALLOW | ALLOW |
| **Global Clearinghouse Governance** | DENY | DENY | DENY | DENY | DENY | ALLOW |
| **System Audit Logs & Metrics** | DENY | DENY | DENY | DENY | DENY | ALLOW |

---

## 2. Customer & Multi-Tenant Isolation Tests

### Horizontal Customer Isolation (IDOR Defense)
- **Scenario**: Customer A (`usr-cust-001`) requests trip details belonging to Customer B (`usr-cust-002`).
- **Control**: `/api/v1/bookings/{booking_id}` filters by `booking.customer_id == session.user_id` unless actor possesses `ROLE_VENDOR_ADMIN` for the servicing vendor or `ROLE_SUPER_ADMIN`.
- **Result**: **PASS** — HTTP 403 / 404 returned for cross-customer requests.

### Vertical Vendor Boundary Isolation
- **Scenario**: Vendor Admin for Philly VIP (`vendor-philly-vip`) attempts to edit pricing rules or view settlements for Dallas Elite (`vendor-dallas-limo`).
- **Control**: Server queries enforce `WHERE vendor_id = :session_vendor_id`.
- **Result**: **PASS** — Cross-vendor data access strictly denied.

### Anonymous / Chauffeur Access to Admin Endpoints
- **Scenario**: Chauffeur token attempts to invoke `POST /api/v1/vendor-in-a-box/register` or `POST /api/v1/pricing/rules`.
- **Control**: FastAPI dependency `require_roles(UserRole.ROLE_VENDOR_ADMIN, UserRole.ROLE_SUPER_ADMIN)` rejects request.
- **Result**: **PASS** — HTTP 403 Forbidden.
