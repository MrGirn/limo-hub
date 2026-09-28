# Comprehensive Deep-Level API-to-UI Coverage & GAP Audit Report

**Total Backend APIs Evaluated**: `299`  
**Connected to UI**: `236` (78.9%)  
**UI GAPs (Missing / Unwired UI)**: `63` (21.1%)  

## 1. Executive Domain Summary

| Operational Subsystem | Total APIs | Connected UIs | UI GAPs | Coverage % |
| :--- | :---: | :---: | :---: | :---: |
| **Autonomous Recovery & FlightAware Engine** | `25` | `25` | `0` | **100.0%** |
| **Billing, Subscriptions & Stripe Connect** | `15` | `15` | `0` | **100.0%** |
| **Bookings, Inbound Leads & Reservations** | `26` | `26` | `0` | **100.0%** |
| **Corporate Accounts & B2B Portal** | `5` | `4` | `1` | **80.0%** |
| **Driver Management & Chauffeur Operations** | `14` | `14` | `0` | **100.0%** |
| **Dynamic Pricing & Instant Quotations** | `18` | `18` | `0` | **100.0%** |
| **Fleet Assets & Vehicle Inventory** | `10` | `10` | `0` | **100.0%** |
| **Global Affiliate Network & Ride Farm-Out** | `8` | `8` | `0` | **100.0%** |
| **Global Hub Governance & Marketplace** | `8` | `5` | `3` | **62.5%** |
| **Other Operations** | `70` | `32` | `38` | **45.7%** |
| **Payroll, Shifts & Settlements** | `5` | `5` | `0` | **100.0%** |
| **Staff, Team & Role Security** | `4` | `4` | `0` | **100.0%** |
| **Support Ticketing Desk** | `21` | `21` | `0` | **100.0%** |
| **Vendor White-Label Branding & Cell Config** | `48` | `32` | `16` | **66.7%** |
| **Voice AI Concierge & Omnichannel Telephony** | `22` | `17` | `5` | **77.3%** |

---

## 2. Granular Subsystem Breakdown & Identified GAPs

### Subsystem: Autonomous Recovery & FlightAware Engine
**Total Endpoints**: `25` | **Connected**: `25` | **Missing UI / GAPs**: `0`

| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/ai/capabilities` | `capabilities` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (Function `capabilities`) | Fully rendered and interactive in UI |
| `GET` | `/api/ai/documents` | `documents` | ✅ **CONNECTED** | `components/DriverManagementModal.tsx` (Function `documents`)<br>`components/DriverMobileDashboard.tsx` (Function `documents`) | Fully rendered and interactive in UI |
| `POST` | `/api/ai/documents` | `add_document` | ✅ **CONNECTED** | `components/AIRecoveryHub.tsx` (API wrapper `addAiDocumentApi`) | Fully rendered and interactive in UI |
| `DELETE` | `/api/ai/documents/{identifier}` | `delete` | ✅ **CONNECTED** | `App.tsx` (Function `delete`)<br>`components/VendorOwnerDashboard.tsx` (Function `delete`) | Fully rendered and interactive in UI |
| `POST` | `/api/ai/evaluate` | `evaluate` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (Function `evaluate`) | Fully rendered and interactive in UI |
| `POST` | `/api/ai/graph/edges` | `edge` | ✅ **CONNECTED** | `components/AIRecoveryHub.tsx` (API wrapper `addAiGraphEdgeApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/ai/retrieve` | `search` | ✅ **CONNECTED** | `App.tsx` (Function `search`)<br>`components/GlobalHubAdminPortal.tsx` (Function `search`)<br>`components/VendorCommercialGuideModal.tsx` (Function `search`)<br>`components/VendorOwnerDashboard.tsx` (Function `search`)<br>`components/public/CustomerBookingsLookupModal.tsx` (Function `search`) | Fully rendered and interactive in UI |
| `POST` | `/api/ai/run` | `run` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (Function `run`) | Fully rendered and interactive in UI |
| `GET` | `/api/ai/runs` | `history` | ✅ **CONNECTED** | `App.tsx` (Function `history`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/ai/model-lifecycle` | `get_ai_model_lifecycle` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (URL `/api/v1/ai/model-lifecycle`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/ai/model-lifecycle/audit-sync` | `run_ai_model_lifecycle_audit` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (URL `/api/v1/ai/model-lifecycle/audit-sync`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/global-hub/radar/broadcast` | `broadcast_flight_radar_event` | ✅ **CONNECTED** | `components/AIRecoveryHub.tsx` (API wrapper `broadcastFlightRadarEventApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/global-hub/shared-ai/invoke` | `invoke_shared_ai_gateway` | ✅ **CONNECTED** | `components/AIRecoveryHub.tsx` (API wrapper `invokeSharedAiGatewayApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/pricing/simulation-scenarios` | `get_pricing_simulation_scenarios` | ✅ **CONNECTED** | `components/AIRecoveryHub.tsx` (API wrapper `fetchVendorSimulationScenariosApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/pricing/simulation-scenarios` | `save_pricing_simulation_scenario` | ✅ **CONNECTED** | `components/AIRecoveryHub.tsx` (API wrapper `savePricingSimulationScenarioApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/recovery/incidents` | `list_incidents` | ✅ **CONNECTED** | `components/AIRecoveryHub.tsx` (API wrapper `fetchIncidents`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/recovery/simulate-flight-delay` | `simulate_flight_delay` | ✅ **CONNECTED** | `components/AIRecoveryHub.tsx` (API wrapper `simulateFlightDelay`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/transit/radar-stream` | `list_radar_stream` | ✅ **CONNECTED** | `components/FlightAwarePlanUpdaterHub.tsx` (API wrapper `fetchTransitRadarStream`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/transit/simulate-radar-delay` | `simulate_radar_delay` | ✅ **CONNECTED** | `components/FlightAwarePlanUpdaterHub.tsx` (API wrapper `simulateRadarDelay`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/ai-yield` | `get_vendor_ai_yield` | ✅ **CONNECTED** | `components/VendorFleetAndPricingHub.tsx` (API wrapper `fetchVendorAiYieldApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/ai-yield/apply` | `apply_vendor_ai_yield` | ✅ **CONNECTED** | `components/VendorFleetAndPricingHub.tsx` (API wrapper `applyVendorAiYieldApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/ai-yield/train` | `train_vendor_ai_yield` | ✅ **CONNECTED** | `components/VendorFleetAndPricingHub.tsx` (API wrapper `trainVendorAiYieldApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/availability/check` | `check_fleet_availability` | ✅ **CONNECTED** | `components/AIRecoveryHub.tsx` (API wrapper `checkFleetAvailabilityApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/simulation-scenarios` | `get_vendor_simulation_scenarios` | ✅ **CONNECTED** | `components/AIRecoveryHub.tsx` (API wrapper `fetchVendorSimulationScenariosApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/webhooks/flightaware` | `webhook_flightaware` | ✅ **CONNECTED** | `components/AIRecoveryHub.tsx` (API wrapper `ingestFlightAwareWebhookApi`) | Fully rendered and interactive in UI |


### Subsystem: Billing, Subscriptions & Stripe Connect
**Total Endpoints**: `15` | **Connected**: `15` | **Missing UI / GAPs**: `0`

| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/v1/hub/subscriptions/overview` | `get_hub_subscriptions_overview` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (API wrapper `fetchHubSubscriptionsOverview`, URL `/api/v1/hub/subscriptions/overview`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/hub/subscriptions/{vendor_id}/trigger-dunning-test` | `trigger_dunning_test_alert` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `simulateVendorDunningAlertApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/payments/stripe-architecture` | `get_stripe_architecture_status` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (URL `/api/v1/payments/stripe-architecture`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/support-desk/subscriptions` | `list_support_desk_subscriptions` | ✅ **CONNECTED** | `components/GlobalSupportDeskHub.tsx` (API wrapper `fetchSupportDeskSubscriptions`)<br>`components/VendorOwnerDashboard.tsx` (API wrapper `fetchSupportDeskSubscriptions`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/stripe/connect-link` | `create_vendor_stripe_connect_link` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `createVendorStripeConnectLink`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/stripe/connect-status` | `get_vendor_stripe_connect_status` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorStripeConnectStatusApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/stripe/login-link` | `create_vendor_stripe_login_link` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `createVendorStripeLoginLink`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/subscription` | `get_vendor_subscription_details` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorSubscription`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/subscription/billing-portal` | `create_vendor_billing_portal_session` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `createVendorBillingPortalSession`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/subscription/cancel` | `cancel_vendor_subscription` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `cancelVendorSubscriptionApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/subscription/clear-dunning` | `clear_vendor_dunning_alert` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `clearVendorDunningAlertApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/subscription/pay-as-you-go` | `switch_vendor_to_pay_as_you_go` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `switchVendorPayAsYouGoApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/subscription/simulate-dunning` | `trigger_dunning_test_alert` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `simulateVendorDunningAlertApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/subscription/upgrade` | `upgrade_vendor_subscription` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `upgradeVendorSubscriptionApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/webhooks/stripe` | `webhook_stripe` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (API wrapper `simulateStripeWebhookApi`) | Fully rendered and interactive in UI |


### Subsystem: Bookings, Inbound Leads & Reservations
**Total Endpoints**: `26` | **Connected**: `26` | **Missing UI / GAPs**: `0`

| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/v1/bookings` | `list_bookings` | ✅ **CONNECTED** | `components/AIRecoveryHub.tsx` (API wrapper `fetchBookings`)<br>`components/DriverApp.tsx` (API wrapper `fetchBookings`)<br>`components/DriverMobileDashboard.tsx` (API wrapper `fetchBookings`)<br>`components/FlightAwarePlanUpdaterHub.tsx` (API wrapper `fetchBookings`)<br>`components/VendorDispatchPortal.tsx` (API wrapper `fetchBookings`)<br>`components/public/GlobalMarketplaceBookingPage.tsx` (URL `/api/v1/bookings`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/bookings/lookup` | `lookup_customer_bookings` | ✅ **CONNECTED** | `components/public/CustomerBookingsLookupModal.tsx` (API wrapper `lookupBookingsApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/bookings/{booking_id}` | `get_booking` | ✅ **CONNECTED** | `components/public/GlobalMarketplaceBookingPage.tsx` (URL `/api/v1/bookings`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/bookings/{booking_id}/calendar.ics` | `get_booking_calendar_ics` | ✅ **CONNECTED** | `components/CustomerPortal.tsx` (API wrapper `getBookingCalendarIcsUrl`)<br>`components/public/CustomerBookingsLookupModal.tsx` (API wrapper `getBookingCalendarIcsUrl`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/bookings/{booking_id}/cancel` | `cancel_customer_booking` | ✅ **CONNECTED** | `components/BookingOperationsModal.tsx` (API wrapper `cancelBookingApi`)<br>`components/CustomerPortal.tsx` (API wrapper `cancelBookingApi`)<br>`components/public/CustomerBookingsLookupModal.tsx` (API wrapper `cancelBookingApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/bookings/{booking_id}/live-tracking` | `get_booking_live_tracking` | ✅ **CONNECTED** | `components/public/LiveRideTrackingModal.tsx` (API wrapper `fetchBookingLiveTrackingApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/bookings/{booking_id}/live-tracking` | `get_booking_live_tracking` | ✅ **CONNECTED** | `components/public/LiveRideTrackingModal.tsx` (API wrapper `fetchBookingLiveTrackingApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/bookings/{booking_id}/master-invoice/html` | `get_master_invoice_html` | ✅ **CONNECTED** | `components/BookingOperationsModal.tsx` (API wrapper `fetchBookingMasterInvoiceHtml`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/bookings/{booking_id}/master-receipt/html` | `get_master_receipt_html` | ✅ **CONNECTED** | `components/BookingOperationsModal.tsx` (API wrapper `fetchBookingMasterReceiptHtml`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/bookings/{booking_id}/terms-voucher` | `get_booking_terms_voucher` | ✅ **CONNECTED** | `components/CustomerPortal.tsx` (API wrapper `fetchBookingTermsVoucher`)<br>`components/public/CustomerBookingsLookupModal.tsx` (API wrapper `fetchBookingTermsVoucher`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/corporate/bookings` | `create_corporate_booking` | ✅ **CONNECTED** | `components/CorporateBookerPortal.tsx` (URL `/api/v1/corporate/bookings`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/coverage/inquiry` | `submit_sourcing_inquiry` | ✅ **CONNECTED** | `components/SourcingConciergeDesk.tsx` (API wrapper `submitSourcingInquiry`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/dispatch/bookings/phone-intake` | `create_phone_intake_booking` | ✅ **CONNECTED** | `components/DispatcherPhoneBookingModal.tsx` (API wrapper `createManualPhoneBooking`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/dispatch/bookings/{booking_id}/pod` | `get_booking_proof_of_delivery` | ✅ **CONNECTED** | `components/BookingOperationsModal.tsx` (API wrapper `fetchBookingPodApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/dispatch/bookings/{booking_id}/pod/dispute` | `dispute_booking_delivery` | ✅ **CONNECTED** | `components/BookingOperationsModal.tsx` (API wrapper `disputeBookingDeliveryApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/dispatch/bookings/{booking_id}/pod/incidentals/approve` | `approve_booking_incidentals` | ✅ **CONNECTED** | `components/BookingOperationsModal.tsx` (API wrapper `approveBookingIncidentalsApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/dispatch/bookings/{booking_id}/pod/incidentals/request` | `request_booking_incidentals` | ✅ **CONNECTED** | `components/BookingOperationsModal.tsx` (API wrapper `requestBookingIncidentalsApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/dispatch/bookings/{booking_id}/process-payment` | `process_booking_payment_operations` | ✅ **CONNECTED** | `components/BookingOperationsModal.tsx` (API wrapper `processBookingPaymentOperationsApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/dispatch/bookings/{booking_id}/refund` | `process_booking_refund_operations` | ✅ **CONNECTED** | `components/BookingOperationsModal.tsx` (API wrapper `processBookingRefundOperationsApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/inquiries` | `create_inquiry_endpoint` | ✅ **CONNECTED** | `components/VendorDispatchPortal.tsx` (URL `/api/v1/inquiries`)<br>`components/public/PublicContactPage.tsx` (URL `/api/v1/inquiries`) | Fully rendered and interactive in UI |
| `PATCH` | `/api/v1/inquiries/{inquiry_id}` | `update_inquiry_status` | ✅ **CONNECTED** | `components/VendorDispatchPortal.tsx` (URL `/api/v1/inquiries`)<br>`components/public/PublicContactPage.tsx` (URL `/api/v1/inquiries`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/inquiries/{inquiry_id}/convert-booking` | `convert_inquiry_to_booking` | ✅ **CONNECTED** | `components/VendorDispatchPortal.tsx` (API wrapper `convertInquiryToBookingApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/inquiries/{inquiry_id}/trigger-drip` | `trigger_inquiry_drip` | ✅ **CONNECTED** | `components/VendorDispatchPortal.tsx` (API wrapper `triggerInquiryDripApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/support-desk/pods` | `list_regional_pods_endpoint` | ✅ **CONNECTED** | `components/GlobalSupportDeskHub.tsx` (API wrapper `fetchRegionalStaffingPods`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/bookings` | `list_vendor_bookings` | ✅ **CONNECTED** | `components/VendorDispatchPortal.tsx` (API wrapper `fetchVendorBookingsApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/inquiries` | `list_vendor_inquiries` | ✅ **CONNECTED** | `components/VendorDispatchPortal.tsx` (API wrapper `fetchVendorInquiriesApi`) | Fully rendered and interactive in UI |


### Subsystem: Corporate Accounts & B2B Portal
**Total Endpoints**: `5` | **Connected**: `4` | **Missing UI / GAPs**: `1`

| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/v1/corporate/accounts` | `get_corporate_accounts` | ✅ **CONNECTED** | `components/CorporateBookerPortal.tsx` (URL `/api/v1/corporate/accounts`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/corporate/accounts` | `create_corporate_account` | ✅ **CONNECTED** | `components/CorporateBookerPortal.tsx` (URL `/api/v1/corporate/accounts`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/corporate/accounts/{account_id}` | `get_corporate_account` | ✅ **CONNECTED** | `components/CorporateBookerPortal.tsx` (URL `/api/v1/corporate/accounts`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/corporate/accounts/{account_id}/cost-centers` | `add_cost_center` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `add_cost_center` |
| `POST` | `/api/v1/corporate/validate-policy` | `validate_corporate_policy` | ✅ **CONNECTED** | `components/CorporateBookerPortal.tsx` (URL `/api/v1/corporate/validate-policy`) | Fully rendered and interactive in UI |


### Subsystem: Driver Management & Chauffeur Operations
**Total Endpoints**: `14` | **Connected**: `14` | **Missing UI / GAPs**: `0`

| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/v1/chauffeur/{driver_id}/duty-status` | `get_chauffeur_duty_status` | ✅ **CONNECTED** | `components/DriverMobileDashboard.tsx` (API wrapper `fetchChauffeurDutyStatusApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/dispatch/assign-24h-driver` | `assign_24h_chauffeur` | ✅ **CONNECTED** | `components/VendorDispatchPortal.tsx` (API wrapper `assign24hChauffeur`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/driver/my-offers` | `get_driver_offers` | ✅ **CONNECTED** | `components/DriverApp.tsx` (API wrapper `fetchDriverOffers`)<br>`components/DriverMobileDashboard.tsx` (API wrapper `fetchDriverOffers`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/driver/offers/{offer_id}/accept` | `accept_offer` | ✅ **CONNECTED** | `components/DriverApp.tsx` (API wrapper `acceptDriverOffer`)<br>`components/DriverMobileDashboard.tsx` (API wrapper `acceptDriverOffer`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/driver/trips/{trip_id}/events` | `update_trip_event` | ✅ **CONNECTED** | `components/DriverApp.tsx` (API wrapper `updateTripStatus`)<br>`components/DriverMobileDashboard.tsx` (API wrapper `updateTripStatus`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/drivers/{driver_id}/documents` | `get_driver_documents` | ✅ **CONNECTED** | `components/DriverMobileDashboard.tsx` (API wrapper `fetchDriverDocuments`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/drivers/{driver_id}/documents/upload` | `upload_driver_document_endpoint` | ✅ **CONNECTED** | `components/DriverManagementModal.tsx` (API wrapper `uploadDriverDocumentApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/recovery/simulate-driver-timeout` | `simulate_driver_timeout` | ✅ **CONNECTED** | `components/AIRecoveryHub.tsx` (API wrapper `simulateDriverTimeout`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/telemetry/driver-location` | `ingest_driver_location_ping` | ✅ **CONNECTED** | `components/DriverMobileDashboard.tsx` (URL `/api/v1/telemetry/driver-location`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendor-app/trips/settle-driver-payout` | `settle_driver_payout_endpoint` | ✅ **CONNECTED** | `components/DriverMobileDashboard.tsx` (URL `/api/v1/vendor-app/trips/settle-driver-payout`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/drivers` | `list_vendor_drivers` | ✅ **CONNECTED** | `components/DriverManagementModal.tsx` (API wrapper `fetchVendorDriversApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/drivers` | `list_vendor_drivers` | ✅ **CONNECTED** | `components/DriverManagementModal.tsx` (API wrapper `fetchVendorDriversApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/drivers` | `create_vendor_driver` | ✅ **CONNECTED** | `components/DriverManagementModal.tsx` (API wrapper `createVendorDriverApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/drivers/{driver_id}/compensation-model` | `update_driver_compensation_model` | ✅ **CONNECTED** | `components/DriverManagementModal.tsx` (API wrapper `updateDriverCompensationModelApi`) | Fully rendered and interactive in UI |


### Subsystem: Dynamic Pricing & Instant Quotations
**Total Endpoints**: `18` | **Connected**: `18` | **Missing UI / GAPs**: `0`

| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/demo/quotes` | `quote` | ✅ **CONNECTED** | `types.ts` (Function `quote`)<br>`components/AIRecoveryHub.tsx` (Function `quote`)<br>`components/CorporateBookerPortal.tsx` (Function `quote`)<br>`components/CustomerPortal.tsx` (Function `quote`)<br>`components/DispatcherPhoneBookingModal.tsx` (Function `quote`)<br>`components/PublicVendorQuotePortal.tsx` (Function `quote`)<br>`components/SourcingConciergeDesk.tsx` (Function `quote`)<br>`components/VendorCommercialGuideModal.tsx` (Function `quote`)<br>`components/VendorDispatchPortal.tsx` (Function `quote`)<br>`components/VendorFleetAndPricingHub.tsx` (Function `quote`)<br>`components/public/GlobalMarketplaceBookingPage.tsx` (Function `quote`)<br>`components/public/PublicContactPage.tsx` (Function `quote`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/dispatch/pricing/quick-quote` | `dispatch_quick_quote` | ✅ **CONNECTED** | `components/DispatcherPhoneBookingModal.tsx` (API wrapper `fetchQuickPhoneQuote`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/itineraries/quote` | `quote_multi_modal_itinerary` | ✅ **CONNECTED** | `components/CustomerPortal.tsx` (API wrapper `quoteMasterItinerary`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/itineraries/quote-matrix` | `quote_multi_modal_itinerary_matrix` | ✅ **CONNECTED** | `components/CustomerPortal.tsx` (API wrapper `quoteMasterItineraryMatrix`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/pricing/fx-rates` | `get_fx_rates` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (URL `/api/v1/pricing/fx-rates`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/pricing/fx-rates/sync` | `sync_live_fx_rates` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (URL `/api/v1/pricing/fx-rates/sync`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/pricing/research-simulate` | `run_pricing_research_simulation` | ✅ **CONNECTED** | `components/vendor/OperationsPricingResearchStudio.tsx` (URL `/api/v1/pricing/research-simulate`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/pricing/tax-rules` | `get_regional_tax_rules` | ✅ **CONNECTED** | `components/vendor/OperationsPricingResearchStudio.tsx` (API wrapper `fetchRegionalTaxRulesApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/quotes` | `request_quote` | ✅ **CONNECTED** | `components/CorporateBookerPortal.tsx` (URL `/api/v1/quotes`)<br>`components/CustomerPortal.tsx` (API wrapper `requestQuote`)<br>`components/MultiVendorComparisonStudio.tsx` (URL `/api/v1/quotes`)<br>`components/public/GlobalMarketplaceBookingPage.tsx` (URL `/api/v1/quotes`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/quotes/ai-validate-pricing` | `ai_validate_pricing_quote` | ✅ **CONNECTED** | `components/vendor/OperationsPricingResearchStudio.tsx` (API wrapper `aiValidatePricingQuoteApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/quotes/compare` | `compare_market_quotes` | ✅ **CONNECTED** | `components/MultiVendorComparisonStudio.tsx` (URL `/api/v1/quotes/compare`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/quotes/matrix` | `request_quote_matrix` | ✅ **CONNECTED** | `components/CustomerPortal.tsx` (API wrapper `requestQuoteMatrix`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/quotes/{quote_id}/book` | `accept_and_book` | ✅ **CONNECTED** | `components/CustomerPortal.tsx` (API wrapper `bookQuote`)<br>`components/MultiVendorComparisonStudio.tsx` (API wrapper `bookQuote`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/sourcing/rfp-details/{quote_token}` | `get_rfp_details_by_token` | ✅ **CONNECTED** | `components/PublicVendorQuotePortal.tsx` (API wrapper `fetchRfpDetailsByToken`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/sourcing/submit-quote` | `submit_vendor_quote` | ✅ **CONNECTED** | `components/PublicVendorQuotePortal.tsx` (API wrapper `submitVendorQuoteApi`)<br>`components/SourcingConciergeDesk.tsx` (API wrapper `submitVendorQuoteApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/ai-validate-pricing` | `ai_validate_vendor_pricing` | ✅ **CONNECTED** | `components/vendor/OperationsPricingResearchStudio.tsx` (API wrapper `aiValidateVendorPricingApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/pricing-rules` | `get_vendor_pricing_rules` | ✅ **CONNECTED** | `components/VendorFleetAndPricingHub.tsx` (API wrapper `fetchVendorPricingRules`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/pricing-rules` | `save_vendor_pricing_rule` | ✅ **CONNECTED** | `components/VendorFleetAndPricingHub.tsx` (API wrapper `saveVendorPricingRule`)<br>`components/vendor/OperationsPricingResearchStudio.tsx` (API wrapper `saveVendorPricingRule`) | Fully rendered and interactive in UI |


### Subsystem: Fleet Assets & Vehicle Inventory
**Total Endpoints**: `10` | **Connected**: `10` | **Missing UI / GAPs**: `0`

| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/v1/fleet/drivers` | `list_drivers` | ✅ **CONNECTED** | `components/DriverManagementModal.tsx` (API wrapper `fetchDrivers`)<br>`components/VendorDispatchPortal.tsx` (API wrapper `fetchDrivers`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/fleet/vehicle-options` | `list_vehicle_options` | ✅ **CONNECTED** | `components/CustomerPortal.tsx` (API wrapper `fetchVehicleOptions`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/fleet/vehicles` | `list_vehicles` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (API wrapper `fetchAllVehicles`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/fleet-inventory` | `list_vendor_fleet_inventory` | ✅ **CONNECTED** | `components/VendorFleetAndPricingHub.tsx` (API wrapper `fetchVendorFleetInventory`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/fleet-inventory` | `create_vendor_vehicle` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `createVendorVehicle`) | Fully rendered and interactive in UI |
| `DELETE` | `/api/v1/vendors/{vendor_id}/fleet-inventory/{vehicle_id}` | `delete_vendor_vehicle` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `deleteVendorVehicle`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/fleet-inventory/{vehicle_id}` | `get_vendor_vehicle_detail` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorVehicleDetail`) | Fully rendered and interactive in UI |
| `PUT` | `/api/v1/vendors/{vendor_id}/fleet-inventory/{vehicle_id}` | `update_vendor_vehicle` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `updateVendorVehicle`) | Fully rendered and interactive in UI |
| `PATCH` | `/api/v1/vendors/{vendor_id}/fleet-inventory/{vehicle_id}/toggle-active` | `toggle_vendor_vehicle_active` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `toggleVehicleActive`) | Fully rendered and interactive in UI |
| `PATCH` | `/api/v1/vendors/{vendor_id}/fleet-inventory/{vehicle_id}/toggle-network` | `toggle_vendor_vehicle_network` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `toggleVehicleNetwork`) | Fully rendered and interactive in UI |


### Subsystem: Global Affiliate Network & Ride Farm-Out
**Total Endpoints**: `8` | **Connected**: `8` | **Missing UI / GAPs**: `0`

| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/v1/global-hub/affiliates/knowledge-base` | `get_global_hub_affiliates_knowledge_base` | ✅ **CONNECTED** | `components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `fetchGlobalHubKnowledgeBase`)<br>`components/VendorOwnerDashboard.tsx` (API wrapper `fetchGlobalHubKnowledgeBase`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendor-network/exchange/ledger` | `get_vendor_network_exchange_ledger` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (URL `/api/v1/vendor-network/exchange/ledger`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/affiliates/directory` | `get_global_affiliate_directory` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchGlobalAffiliateDirectory`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/affiliates/farm-out` | `farm_out_ride_to_affiliate` | ✅ **CONNECTED** | `components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `farmOutAffiliateRide`)<br>`components/VendorOwnerDashboard.tsx` (API wrapper `farmOutAffiliateRide`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/affiliates/policy` | `get_vendor_affiliate_policy` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorAffiliatePolicy`) | Fully rendered and interactive in UI |
| `PUT` | `/api/v1/vendors/{vendor_id}/affiliates/policy` | `update_vendor_affiliate_policy` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `updateVendorAffiliatePolicy`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/affiliates/recommendations` | `get_affiliate_recommendations_for_ride` | ✅ **CONNECTED** | `components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `fetchAffiliateRecommendations`)<br>`components/VendorOwnerDashboard.tsx` (API wrapper `fetchAffiliateRecommendations`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/affiliates/records` | `get_vendor_affiliate_records` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorAffiliateRecords`) | Fully rendered and interactive in UI |


### Subsystem: Global Hub Governance & Marketplace
**Total Endpoints**: `8` | **Connected**: `5` | **Missing UI / GAPs**: `3`

| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/v1/global-hub/analytics` | `get_global_hub_analytics` | ✅ **CONNECTED** | `components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `fetchGlobalHubAnalyticsApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/global-hub/clearinghouse/ledger` | `get_global_hub_clearinghouse_ledger` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `get_global_hub_clearinghouse_ledger` |
| `GET` | `/api/v1/global-hub/dispatch-metrics` | `get_global_hub_dispatch_metrics` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (URL `/api/v1/global-hub/dispatch-metrics`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/global-hub/dispatch-route` | `route_global_hub_booking` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (URL `/api/v1/global-hub/dispatch-route`)<br>`components/public/GlobalMarketplaceBookingPage.tsx` (URL `/api/v1/global-hub/dispatch-route`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/global-hub/dispatch-sla-sweep` | `trigger_dispatch_sla_sweep` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `trigger_dispatch_sla_sweep` |
| `GET` | `/api/v1/payments/global-settlements` | `get_global_settlement_ledger` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (URL `/api/v1/payments/global-settlements`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/payments/simulate-escrow-settlement` | `simulate_escrow_settlement_api` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `simulate_escrow_settlement_api` |
| `GET` | `/api/v1/settlements/split-records` | `list_split_settlements` | ✅ **CONNECTED** | `components/VendorDispatchPortal.tsx` (API wrapper `fetchSplitSettlements`) | Fully rendered and interactive in UI |


### Subsystem: Other Operations
**Total Endpoints**: `70` | **Connected**: `32` | **Missing UI / GAPs**: `38`

| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `WS/MOUNT` | `` | `static_frontend` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `static_frontend` |
| `GET` | `/api/demo/policy` | `policy` | ✅ **CONNECTED** | `components/AIRecoveryHub.tsx` (Function `policy`)<br>`components/BookingOperationsModal.tsx` (Function `policy`)<br>`components/CustomerPortal.tsx` (Function `policy`)<br>`components/VendorOwnerDashboard.tsx` (Function `policy`)<br>`components/public/CustomerBookingsLookupModal.tsx` (Function `policy`)<br>`components/public/PublicHomePage.tsx` (Function `policy`)<br>`components/public/PublicPoliciesPage.tsx` (Function `policy`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/auth/me` | `get_current_session` | ✅ **CONNECTED** | `context/AuthContext.tsx` (API wrapper `fetchCurrentSession`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/auth/oauth-login` | `oauth_login` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `oauth_login` |
| `POST` | `/api/v1/auth/passkey/auth-challenge` | `passkey_auth_challenge` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `passkey_auth_challenge` |
| `POST` | `/api/v1/auth/passkey/register-challenge` | `passkey_register_challenge` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `passkey_register_challenge` |
| `POST` | `/api/v1/auth/passkey/verify-auth` | `passkey_verify_auth` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `passkey_verify_auth` |
| `POST` | `/api/v1/auth/passkey/verify-registration` | `passkey_verify_registration` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `passkey_verify_registration` |
| `GET` | `/api/v1/auth/personas` | `list_available_personas` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `list_available_personas` |
| `POST` | `/api/v1/auth/switch-persona` | `switch_persona` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `switch_persona` |
| `GET` | `/api/v1/compliance/alerts` | `get_compliance_alerts` | ✅ **CONNECTED** | `components/VendorDispatchPortal.tsx` (API wrapper `fetchComplianceAlerts`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/compliance/scan` | `trigger_compliance_scan` | ✅ **CONNECTED** | `components/VendorDispatchPortal.tsx` (API wrapper `triggerComplianceScan`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/coverage/evaluate` | `evaluate_coverage` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `evaluate_coverage` |
| `GET` | `/api/v1/customers/lookup` | `lookup_customer_for_intake` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `lookup_customer_for_intake` |
| `GET` | `/api/v1/customers/{customer_id}` | `get_customer_profile` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `get_customer_profile` |
| `POST` | `/api/v1/customers/{customer_id}/addresses` | `add_customer_saved_address` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `add_customer_saved_address` |
| `PATCH` | `/api/v1/customers/{customer_id}/preferences` | `update_customer_preferences` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `update_customer_preferences` |
| `GET` | `/api/v1/dispatch/assignment-audits/{trip_id}` | `get_assignment_audit` | ✅ **CONNECTED** | `components/VendorDispatchPortal.tsx` (API wrapper `fetchAssignmentAudit`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/dispatch/pending-24h-alerts` | `get_pending_24h_dispatch_alerts` | ✅ **CONNECTED** | `components/VendorDispatchPortal.tsx` (API wrapper `fetchPending24hDispatchAlerts`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/dispatch/verify-eligibility` | `verify_pre_dispatch_eligibility` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `verify_pre_dispatch_eligibility` |
| `GET` | `/api/v1/flights/{flight_ident}/live-status` | `get_live_flight_status` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `get_live_flight_status` |
| `GET` | `/api/v1/graph-rag/export` | `export_graph_rag` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (URL `/api/v1/graph-rag/export`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/graph-rag/neo4j/cypher` | `execute_cypher_query` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (URL `/api/v1/graph-rag/neo4j/cypher`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/graph-rag/neo4j/sync` | `sync_neo4j_aura` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (URL `/api/v1/graph-rag/neo4j/sync`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/graph-rag/paths` | `query_graph_rag_paths` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (URL `/api/v1/graph-rag/paths`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/graph-rag/verify` | `verify_regulatory_claim` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (URL `/api/v1/graph-rag/verify`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/hub/helicopter-config` | `get_hub_helicopter_config_endpoint` | ✅ **CONNECTED** | `components/HelicopterComplianceHubControl.tsx` (API wrapper `fetchHelicopterHubConfig`) | Fully rendered and interactive in UI |
| `PUT` | `/api/v1/hub/helicopter-config` | `update_hub_helicopter_config_endpoint` | ✅ **CONNECTED** | `components/HelicopterComplianceHubControl.tsx` (API wrapper `updateHelicopterHubConfig`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/hub/helicopter/validate` | `validate_helicopter_leg_endpoint` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `validate_helicopter_leg_endpoint` |
| `GET` | `/api/v1/hub/heliports` | `list_hub_domestic_heliports` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `list_hub_domestic_heliports` |
| `GET` | `/api/v1/hub/toll-registry` | `get_central_toll_registry` | ✅ **CONNECTED** | `components/vendor/OperationsPricingResearchStudio.tsx` (URL `/api/v1/hub/toll-registry`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/hub/vendors/{vendor_id}/charge-auto-pay` | `charge_vendor_auto_pay_endpoint` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `charge_vendor_auto_pay_endpoint` |
| `PUT` | `/api/v1/hub/vendors/{vendor_id}/charging-profile` | `update_vendor_charging_profile_endpoint` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `update_vendor_charging_profile_endpoint` |
| `GET` | `/api/v1/infrastructure/compliance-vault` | `list_compliance_vaults` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `list_compliance_vaults` |
| `POST` | `/api/v1/intake/parse-enquiry` | `parse_omnichannel_enquiry` | ✅ **CONNECTED** | `components/OmnichannelPortal.tsx` (API wrapper `parseOmnichannelEnquiry`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/itineraries/{itinerary_id}/book` | `book_multi_modal_itinerary` | ✅ **CONNECTED** | `components/CustomerPortal.tsx` (API wrapper `bookItinerary`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/maps/calculate-route` | `calculate_route_matrix` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `calculate_route_matrix` |
| `GET` | `/api/v1/maps/places-autocomplete` | `places_autocomplete` | ✅ **CONNECTED** | `components/AddressAutocompleteInput.tsx` (URL `/api/v1/maps/places-autocomplete`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/maps/validate-address` | `validate_address` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `validate_address` |
| `GET` | `/api/v1/media/{file_path:path}` | `serve_media_vault_file` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `serve_media_vault_file` |
| `GET` | `/api/v1/network/jobs` | `get_network_jobs` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `get_network_jobs` |
| `POST` | `/api/v1/public/vendor-onboarding/submit` | `submit_public_vendor_onboarding` | ✅ **CONNECTED** | `components/public/PublicVendorOnboardingPage.tsx` (API wrapper `submitPublicVendorOnboarding`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/public/vendor-onboarding/validate` | `validate_public_vendor_onboarding` | ✅ **CONNECTED** | `components/public/PublicVendorOnboardingPage.tsx` (API wrapper `validatePublicVendorOnboarding`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/sourcing/manager-override` | `manager_phone_quote_override` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `manager_phone_quote_override` |
| `GET` | `/api/v1/sourcing/opportunities` | `get_all_sourcing_opportunities` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `get_all_sourcing_opportunities` |
| `POST` | `/api/v1/sourcing/trigger-rfp` | `trigger_manual_sourcing_rfp` | ✅ **CONNECTED** | `components/SourcingConciergeDesk.tsx` (API wrapper `triggerManualSourcingRfp`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/system-summary` | `get_system_summary` | ✅ **CONNECTED** | `components/VendorDispatchPortal.tsx` (API wrapper `fetchSystemSummary`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/system/runtime-mode` | `get_system_runtime_mode` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `get_system_runtime_mode` |
| `POST` | `/api/v1/telemetry/location` | `ingest_telemetry_ping` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `ingest_telemetry_ping` |
| `POST` | `/api/v1/transit/inbound-plan-update` | `execute_inbound_plan_update` | ✅ **CONNECTED** | `components/FlightAwarePlanUpdaterHub.tsx` (API wrapper `executeInboundPlanUpdate`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/trips/{trip_id}` | `get_trip` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `get_trip` |
| `GET` | `/api/v1/trips/{trip_id}/live-tracking` | `get_trip_live_tracking` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `get_trip_live_tracking` |
| `GET` | `/api/v1/trips/{trip_id}/live-tracking` | `get_trip_live_tracking` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `get_trip_live_tracking` |
| `GET` | `/api/v1/vendors` | `list_vendors` | ✅ **CONNECTED** | `components/CustomerPortal.tsx` (URL `/api/v1/vendors`)<br>`components/DriverMobileDashboard.tsx` (URL `/api/v1/vendors`)<br>`components/VendorDispatchPortal.tsx` (API wrapper `fetchVendors`, URL `/api/v1/vendors`)<br>`components/VendorFleetAndPricingHub.tsx` (API wrapper `fetchVendors`)<br>`components/VendorOwnerDashboard.tsx` (URL `/api/v1/vendors`)<br>`components/public/PublicFleetPage.tsx` (URL `/api/v1/vendors`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/account/delete-request` | `request_vendor_account_deletion` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `request_vendor_account_deletion` |
| `GET` | `/api/v1/vendors/{vendor_id}/comm-config` | `get_vendor_comm_config` | ✅ **CONNECTED** | `components/VendorFleetAndPricingHub.tsx` (API wrapper `fetchVendorCommConfig`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/comm-config` | `save_vendor_comm_config` | ✅ **CONNECTED** | `components/VendorFleetAndPricingHub.tsx` (API wrapper `saveVendorCommConfig`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/config` | `get_vendor_intake_config` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorIntakeConfigApi`) | Fully rendered and interactive in UI |
| `PUT` | `/api/v1/vendors/{vendor_id}/config` | `update_vendor_intake_config` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `updateVendorIntakeConfigApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/customers` | `list_vendor_customers` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `list_vendor_customers` |
| `POST` | `/api/v1/vendors/{vendor_id}/customers` | `create_or_register_customer` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `create_or_register_customer` |
| `POST` | `/api/v1/vendors/{vendor_id}/evaluate-multileg-strategy` | `evaluate_vendor_multileg_strategy` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `evaluateVendorMultilegStrategy`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/media/upload-s3` | `upload_vendor_media_to_s3` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `upload_vendor_media_to_s3` |
| `POST` | `/api/v1/vendors/{vendor_id}/outbox/flush` | `flush_vendor_outbox_queue` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `flush_vendor_outbox_queue` |
| `GET` | `/api/v1/vendors/{vendor_id}/outbox/telemetry` | `get_vendor_outbox_telemetry` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `get_vendor_outbox_telemetry` |
| `GET` | `/api/v1/vendors/{vendor_id}/schedule` | `get_vendor_schedule` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorOperatingScheduleApi`) | Fully rendered and interactive in UI |
| `PUT` | `/api/v1/vendors/{vendor_id}/schedule` | `update_vendor_schedule` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `updateVendorOperatingScheduleApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/webhooks/events` | `list_webhook_events` | ✅ **CONNECTED** | `components/VendorDispatchPortal.tsx` (API wrapper `fetchWebhookEvents`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/webhooks/simulate` | `simulate_webhook_event` | ✅ **CONNECTED** | `components/VendorDispatchPortal.tsx` (API wrapper `simulateWebhookEvent`) | Fully rendered and interactive in UI |
| `GET` | `/health` | `health` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `health` |


### Subsystem: Payroll, Shifts & Settlements
**Total Endpoints**: `5` | **Connected**: `5` | **Missing UI / GAPs**: `0`

| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/v1/vendors/{vendor_id}/payouts/ledger` | `get_vendor_payouts_ledger` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorPayoutsLedger`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/payroll/export` | `export_vendor_payroll_csv` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `exportPayrollCsvApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/payroll/process-trip` | `process_trip_payout` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `processTripPayoutApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/payroll/record-shift` | `record_driver_shift` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `recordDriverShiftApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/payroll/summary` | `get_vendor_payroll_summary` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorPayrollSummaryApi`) | Fully rendered and interactive in UI |


### Subsystem: Staff, Team & Role Security
**Total Endpoints**: `4` | **Connected**: `4` | **Missing UI / GAPs**: `0`

| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/v1/vendors/{vendor_id}/team` | `list_vendor_team` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorTeam`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/team` | `create_vendor_team_member` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `createVendorTeamMember`) | Fully rendered and interactive in UI |
| `DELETE` | `/api/v1/vendors/{vendor_id}/team/{user_id}` | `delete_vendor_team_member` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `deleteVendorTeamMember`) | Fully rendered and interactive in UI |
| `PUT` | `/api/v1/vendors/{vendor_id}/team/{user_id}` | `update_vendor_team_member` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `updateVendorTeamMember`) | Fully rendered and interactive in UI |


### Subsystem: Support Ticketing Desk
**Total Endpoints**: `21` | **Connected**: `21` | **Missing UI / GAPs**: `0`

| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/v1/global-hub/support/sla-sweep` | `sweep_support_sla` | ✅ **CONNECTED** | `components/hub/GlobalHubSupportTab.tsx` (URL `/api/v1/global-hub/support/sla-sweep`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/global-hub/support/tickets` | `list_global_hub_support_tickets` | ✅ **CONNECTED** | `components/hub/GlobalHubSupportTab.tsx` (API wrapper `fetchGlobalHubSupportTicketsApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/global-hub/support/tickets/{ticket_id}/escalate` | `escalate_ticket_to_global_hub` | ✅ **CONNECTED** | `components/vendor/VendorSupportInboxTab.tsx` (API wrapper `escalateTicketToGlobalHubApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/support-desk/config` | `get_support_desk_config` | ✅ **CONNECTED** | `components/GlobalSupportDeskHub.tsx` (API wrapper `fetchSupportDeskConfig`) | Fully rendered and interactive in UI |
| `PUT` | `/api/v1/support-desk/config` | `update_support_desk_config` | ✅ **CONNECTED** | `components/GlobalSupportDeskHub.tsx` (API wrapper `updateSupportDeskConfig`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/support-desk/overview` | `get_support_desk_overview` | ✅ **CONNECTED** | `components/GlobalSupportDeskHub.tsx` (API wrapper `fetchSupportDeskOverview`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/support-desk/plans` | `list_support_desk_plans` | ✅ **CONNECTED** | `components/GlobalSupportDeskHub.tsx` (API wrapper `fetchSupportDeskPlans`)<br>`components/VendorOwnerDashboard.tsx` (API wrapper `fetchSupportDeskPlans`) | Fully rendered and interactive in UI |
| `PUT` | `/api/v1/support-desk/plans/{plan_id}` | `update_support_desk_plan_endpoint` | ✅ **CONNECTED** | `components/GlobalSupportDeskHub.tsx` (API wrapper `updateSupportDeskPlan`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/support-desk/sla/evaluate-triggers` | `evaluate_sla_triggers_endpoint` | ✅ **CONNECTED** | `components/GlobalSupportDeskHub.tsx` (API wrapper `evaluateAutomatedSlaTriggers`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/support-desk/subscribe` | `subscribe_vendor_support_endpoint` | ✅ **CONNECTED** | `components/GlobalSupportDeskHub.tsx` (API wrapper `subscribeVendorSupportDesk`)<br>`components/VendorOwnerDashboard.tsx` (API wrapper `subscribeVendorSupportDesk`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/support-desk/tickets` | `list_support_tickets` | ✅ **CONNECTED** | `components/GlobalSupportDeskHub.tsx` (API wrapper `fetchSupportTickets`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/support-desk/tickets` | `create_support_ticket_endpoint` | ✅ **CONNECTED** | `components/GlobalSupportDeskHub.tsx` (API wrapper `createSupportTicket`) | Fully rendered and interactive in UI |
| `PUT` | `/api/v1/support-desk/tickets/{ticket_id}` | `update_support_ticket_endpoint` | ✅ **CONNECTED** | `components/GlobalSupportDeskHub.tsx` (API wrapper `updateSupportTicket`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/support-desk/tickets/{ticket_id}/mutate` | `mutate_ticket_booking_endpoint` | ✅ **CONNECTED** | `components/GlobalSupportDeskHub.tsx` (API wrapper `mutateSupportTicketBooking`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/support/tickets` | `create_customer_support_ticket` | ✅ **CONNECTED** | `components/public/CustomerSupportChatWidget.tsx` (API wrapper `createSupportTicketApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/support/tickets/lookup` | `lookup_customer_support_tickets` | ✅ **CONNECTED** | `components/public/CustomerSupportChatWidget.tsx` (API wrapper `lookupSupportTicketsApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/support/tickets/{ticket_id}` | `get_support_ticket` | ✅ **CONNECTED** | `components/GlobalSupportDeskHub.tsx` (API wrapper `fetchSupportTicketApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/support/tickets/{ticket_id}/messages` | `add_ticket_message` | ✅ **CONNECTED** | `components/hub/GlobalHubSupportTab.tsx` (API wrapper `addTicketMessageApi`)<br>`components/public/CustomerSupportChatWidget.tsx` (API wrapper `addTicketMessageApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/support/tickets` | `list_vendor_support_tickets` | ✅ **CONNECTED** | `components/vendor/VendorSupportInboxTab.tsx` (API wrapper `fetchVendorSupportTicketsApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/support/tickets/{ticket_id}/reply` | `reply_to_vendor_ticket` | ✅ **CONNECTED** | `components/vendor/VendorSupportInboxTab.tsx` (API wrapper `replyVendorTicketApi`) | Fully rendered and interactive in UI |
| `PUT` | `/api/v1/vendors/{vendor_id}/support/tickets/{ticket_id}/resolve` | `resolve_vendor_ticket` | ✅ **CONNECTED** | `components/hub/GlobalHubSupportTab.tsx` (API wrapper `resolveVendorTicketApi`)<br>`components/vendor/VendorSupportInboxTab.tsx` (API wrapper `resolveVendorTicketApi`) | Fully rendered and interactive in UI |


### Subsystem: Vendor White-Label Branding & Cell Config
**Total Endpoints**: `48` | **Connected**: `32` | **Missing UI / GAPs**: `16`

| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/v1/bookings/{booking_id}/email-receipt` | `get_booking_email_receipt` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `get_booking_email_receipt` |
| `GET` | `/api/v1/infrastructure/cells` | `list_infrastructure_cells` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (URL `/api/v1/infrastructure/cells`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/infrastructure/cells/bulk-push-aws` | `bulk_push_cells_to_aws` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (URL `/api/v1/infrastructure/cells/bulk-push-aws`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/infrastructure/cells/{vendor_id}` | `get_cell_infrastructure` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (URL `/api/v1/infrastructure/cells`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/infrastructure/cells/{vendor_id}/compliance-vault` | `get_cell_compliance_vault` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `get_cell_compliance_vault` |
| `GET` | `/api/v1/infrastructure/cells/{vendor_id}/domain-mapping` | `get_cell_domain_mapping` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `get_cell_domain_mapping` |
| `PUT` | `/api/v1/infrastructure/cells/{vendor_id}/domain-mapping` | `update_cell_domain_mapping` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `update_cell_domain_mapping` |
| `POST` | `/api/v1/infrastructure/cells/{vendor_id}/lifecycle` | `execute_cell_lifecycle` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `execute_cell_lifecycle` |
| `POST` | `/api/v1/infrastructure/cells/{vendor_id}/push-to-aws` | `push_cell_infrastructure_to_aws` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `push_cell_infrastructure_to_aws` |
| `POST` | `/api/v1/infrastructure/cells/{vendor_id}/start` | `start_sovereign_cell_endpoint` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `start_sovereign_cell_endpoint` |
| `POST` | `/api/v1/infrastructure/cells/{vendor_id}/stop` | `stop_sovereign_cell_endpoint` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `stop_sovereign_cell_endpoint` |
| `POST` | `/api/v1/infrastructure/cells/{vendor_id}/terminate` | `terminate_sovereign_cell_endpoint` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `terminate_sovereign_cell_endpoint` |
| `POST` | `/api/v1/sourcing/inbound-email-webhook` | `receive_inbound_vendor_email_webhook` | ✅ **CONNECTED** | `components/SourcingConciergeDesk.tsx` (URL `/api/v1/sourcing/inbound-email-webhook`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendor-cell/cells` | `list_vendor_cells` | ✅ **CONNECTED** | `components/AIRecoveryHub.tsx` (API wrapper `listVendorCellsApi`)<br>`components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `listVendorCellsApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendor-cell/manifest-template` | `get_vendor_manifest_template` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (URL `/api/v1/vendor-cell/manifest-template`)<br>`components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `fetchVendorManifestTemplateApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendor-cell/spin-up` | `spin_up_vendor_cell` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (URL `/api/v1/vendor-cell/spin-up`)<br>`components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `spinUpVendorCellApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendor-cell/validate-yaml` | `validate_vendor_yaml` | ✅ **CONNECTED** | `components/GlobalHubAdminPortal.tsx` (URL `/api/v1/vendor-cell/validate-yaml`)<br>`components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `validateVendorYamlApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendor-cell/{vendor_id}/affiliate/farm-out` | `farm_out_affiliate_ride` | ✅ **CONNECTED** | `components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `farmOutAffiliateRide`)<br>`components/VendorOwnerDashboard.tsx` (API wrapper `farmOutAffiliateRide`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendor-cell/{vendor_id}/affiliate/records` | `get_vendor_affiliate_records` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorAffiliateRecords`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendor-cell/{vendor_id}/booking/direct` | `create_vendor_cell_direct_booking` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `create_vendor_cell_direct_booking` |
| `POST` | `/api/v1/vendor-cell/{vendor_id}/circuit-breaker` | `toggle_vendor_cell_circuit_breaker` | ✅ **CONNECTED** | `components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `toggleVendorCellCircuitBreakerApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendor-cell/{vendor_id}/email/config` | `get_vendor_email_config` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorEmailConfigApi`) | Fully rendered and interactive in UI |
| `PUT` | `/api/v1/vendor-cell/{vendor_id}/email/config` | `update_vendor_email_config` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `updateVendorEmailConfigApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendor-cell/{vendor_id}/email/inbound-parse` | `parse_vendor_inbound_email` | ✅ **CONNECTED** | `components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `parseVendorInboundEmailApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendor-cell/{vendor_id}/email/inbox` | `get_vendor_email_inbox` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `get_vendor_email_inbox` |
| `POST` | `/api/v1/vendor-cell/{vendor_id}/email/outbound-dispatch` | `dispatch_vendor_outbound_email` | ✅ **CONNECTED** | `components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `dispatchVendorOutboundEmailApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendor-cell/{vendor_id}/email/rfqs/{rfq_id}/convert-booking` | `convert_email_rfq_to_booking` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `convert_email_rfq_to_booking` |
| `POST` | `/api/v1/vendor-cell/{vendor_id}/email/send-invoice` | `send_vendor_trip_invoice` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `send_vendor_trip_invoice` |
| `POST` | `/api/v1/vendor-cell/{vendor_id}/email/test` | `test_vendor_email_connection` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `test_vendor_email_connection` |
| `POST` | `/api/v1/vendor-cell/{vendor_id}/email/test-inbound` | `test_vendor_inbound_email_connection` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `test_vendor_inbound_email_connection` |
| `POST` | `/api/v1/vendor-cell/{vendor_id}/onboarding-invite` | `send_vendor_onboarding_invite` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `sendVendorOnboardingInvite`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendor-cell/{vendor_id}/onboarding-status` | `get_vendor_onboarding_status` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorOnboardingStatus`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendor-cell/{vendor_id}/outbox/sync` | `sync_vendor_outbox_to_global_hub` | ✅ **CONNECTED** | `components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `syncVendorOutboxToGlobalHubApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendor-cell/{vendor_id}/portal-config` | `get_vendor_portal_config` | ✅ **CONNECTED** | `App.tsx` (API wrapper `fetchVendorPortalConfig`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendor-cell/{vendor_id}/status` | `get_vendor_cell_status` | ✅ **CONNECTED** | `components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `fetchVendorCellStatusApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendor-cell/{vendor_id}/team` | `list_vendor_team` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorTeam`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendor-cell/{vendor_id}/team` | `create_vendor_team_member` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `createVendorTeamMember`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendor-cell/{vendor_id}/team/roles-matrix` | `get_vendor_roles_matrix` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorRolesMatrix`) | Fully rendered and interactive in UI |
| `DELETE` | `/api/v1/vendor-cell/{vendor_id}/team/{user_id}` | `delete_vendor_team_member` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `deleteVendorTeamMember`) | Fully rendered and interactive in UI |
| `PUT` | `/api/v1/vendor-cell/{vendor_id}/team/{user_id}` | `update_vendor_team_member` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `updateVendorTeamMember`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendor-cell/{vendor_id}/team/{user_id}/impersonate-token` | `generate_team_member_impersonate_token` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `generateTeamMemberImpersonateToken`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendor-portal/resolve-domain` | `resolve_vendor_domain` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `resolve_vendor_domain` |
| `GET` | `/api/v1/vendor-portal/resolve-token` | `resolve_vendor_token` | ✅ **CONNECTED** | `components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `resolveVendorPortalTokenApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendor-portal/token/{vendor_id}` | `generate_vendor_token` | ✅ **CONNECTED** | `components/VendorCellAndGlobalHubStudio.tsx` (API wrapper `generateVendorPortalTokenApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/register` | `register_vendor` | ✅ **CONNECTED** | `components/VendorRegistrationPortal.tsx` (API wrapper `registerVendor`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/branding` | `get_vendor_branding_settings` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorBrandingSettingsApi`) | Fully rendered and interactive in UI |
| `PUT` | `/api/v1/vendors/{vendor_id}/branding` | `update_vendor_branding_settings` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `updateVendorBrandingSettingsApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/seo-schema` | `get_vendor_seo_schema` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchVendorSeoSchemaApi`) | Fully rendered and interactive in UI |


### Subsystem: Voice AI Concierge & Omnichannel Telephony
**Total Endpoints**: `22` | **Connected**: `17` | **Missing UI / GAPs**: `5`

| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/v1/corporate/invoices/{account_id}` | `get_corporate_invoices` | ✅ **CONNECTED** | `components/CorporateBookerPortal.tsx` (URL `/api/v1/corporate/invoices`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/corporate/invoices/{invoice_id}/csv` | `export_invoice_csv` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `exportCorporateInvoiceCsvApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/hub/vendors/{vendor_id}/send-invoice` | `send_vendor_invoice_endpoint` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `send_vendor_invoice_endpoint` |
| `POST` | `/api/v1/support-desk/voice/resolve-inbound` | `resolve_inbound_voice_endpoint` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `resolve_inbound_voice_endpoint` |
| `POST` | `/api/v1/support-desk/voice/twiml-inbound` | `get_inbound_twiml_xml` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `get_inbound_twiml_xml` |
| `POST` | `/api/v1/vendors/{vendor_id}/omnichannel/config` | `update_vendor_omnichannel_config` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `updateVendorOmnichannelConfigApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/omnichannel/desk` | `get_vendor_omnichannel_desk` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `fetchOmnichannelWorkspaceApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/omnichannel/dial-call` | `record_voice_studio_call` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `recordVoiceStudioCallApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/omnichannel/send-message` | `send_omnichannel_chat_message` | ✅ **CONNECTED** | `components/VendorOwnerDashboard.tsx` (API wrapper `sendOmnichannelMessageApi`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/vendors/{vendor_id}/telecom-compliance` | `get_vendor_telecom_compliance` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (API wrapper `fetchVendorTelecomCompliance`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/telecom-compliance/inbound-sms` | `process_inbound_sms_compliance` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (API wrapper `processInboundSmsComplianceApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/telecom-compliance/register-brand` | `register_vendor_brand` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (API wrapper `registerVendor10DlcBrand`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/vendors/{vendor_id}/voice-call-intake` | `execute_voice_call_intake` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (API wrapper `executeVoiceCallIntakeApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/voice/barge-in` | `trigger_voice_barge_in` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (URL `/api/v1/voice/barge-in`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/voice/consent` | `submit_voice_consent` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (URL `/api/v1/voice/consent`) | Fully rendered and interactive in UI |
| `GET` | `/api/v1/voice/session/{session_id}` | `get_voice_session` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (API wrapper `fetchVoiceSessionApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/voice/simulate-call` | `simulate_voice_call` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (API wrapper `simulateVoiceCallApi`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/voice/utterance` | `process_voice_utterance` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (URL `/api/v1/voice/utterance`) | Fully rendered and interactive in UI |
| `POST` | `/api/v1/webhooks/twilio/voice` | `webhook_twilio_voice` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `webhook_twilio_voice` |
| `POST` | `/api/v1/webhooks/twilio/whatsapp` | `webhook_twilio_whatsapp` | ❌ **GAP (NO UI)** | *None* | Missing frontend trigger, modal, or form in UI for `webhook_twilio_whatsapp` |
| `WS/MOUNT` | `/ws/voice/stream` | `voice_websocket_stream` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (URL `/ws/voice/stream`) | Fully rendered and interactive in UI |
| `WS/MOUNT` | `/ws/voice/twilio/media` | `twilio_voice_media_stream` | ✅ **CONNECTED** | `components/VoiceAIStudio.tsx` (URL `/ws/voice/twilio/media`) | Fully rendered and interactive in UI |

