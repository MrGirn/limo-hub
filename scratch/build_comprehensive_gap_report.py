import json
import re
import os

def build_report():
    with open('scratch/all_backend_endpoints_detailed.json', 'r', encoding='utf-8') as f:
        endpoints = json.load(f)

    with open('frontend/src/api.ts', 'r', encoding='utf-8') as f:
        api_ts = f.read()

    frontend_src = 'frontend/src'
    ui_files = {}
    for root, dirs, files in os.walk(frontend_src):
        for fl in files:
            if fl.endswith(('.tsx', '.ts')):
                p = os.path.join(root, fl)
                rel = os.path.relpath(p, frontend_src).replace('\\', '/')
                with open(p, 'r', encoding='utf-8') as fh:
                    ui_files[rel] = fh.read()

    # Pre-parse exported function names in api.ts
    exported_fns = set(re.findall(r'export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)', api_ts))
    exported_consts = set(re.findall(r'export\s+const\s+([a-zA-Z0-9_]+)', api_ts))
    all_api_exports = exported_fns.union(exported_consts)

    # Pre-index tokens in UI files
    ui_words = {fl: set(re.findall(r'[a-zA-Z0-9_\-/]+', content)) for fl, content in ui_files.items()}

    # Map of known endpoint functions to api.ts wrappers
    function_to_wrapper = {
        'get_master_invoice_html': 'fetchBookingMasterInvoiceHtml',
        'get_master_receipt_html': 'fetchBookingMasterReceiptHtml',
        'cancel_customer_booking': 'cancelBookingApi',
        'get_booking_proof_of_delivery': 'fetchBookingPodApi',
        'request_booking_incidentals': 'requestBookingIncidentalsApi',
        'approve_booking_incidentals': 'approveBookingIncidentalsApi',
        'dispute_booking_delivery': 'disputeBookingDeliveryApi',
        'process_booking_payment_operations': 'processBookingPaymentOperationsApi',
        'process_booking_refund_operations': 'processBookingRefundOperationsApi',
        'update_driver_compensation_model': 'updateDriverCompensationModelApi',
        'upload_driver_document_endpoint': 'uploadDriverDocumentApi',
        'accept_offer': 'acceptDriverOfferApi',
        
        # Support Desk
        'create_support_ticket': 'createSupportTicketApi',
        'create_customer_support_ticket': 'createSupportTicketApi',
        'lookup_support_tickets': 'lookupSupportTicketsApi',
        'lookup_customer_support_tickets': 'lookupSupportTicketsApi',
        'get_support_ticket': 'fetchSupportTicketApi',
        'get_support_ticket_details': 'fetchSupportTicketApi',
        'add_ticket_message': 'addTicketMessageApi',
        'list_vendor_support_tickets': 'fetchVendorSupportTicketsApi',
        'reply_vendor_ticket': 'replyVendorTicketApi',
        'reply_to_vendor_ticket': 'replyVendorTicketApi',
        'resolve_vendor_ticket': 'resolveVendorTicketApi',
        'list_global_hub_support_tickets': 'fetchGlobalHubSupportTicketsApi',
        'escalate_ticket_to_global_hub': 'escalateTicketToGlobalHubApi',
        'get_support_desk_plans': 'fetchSupportDeskPlans',
        'update_support_desk_plan': 'updateSupportDeskPlan',
        'update_support_desk_plan_endpoint': 'updateSupportDeskPlan',
        'get_support_desk_config': 'fetchSupportDeskConfig',
        'update_support_desk_config': 'updateSupportDeskConfig',
        'subscribe_vendor_support_desk': 'subscribeVendorSupportDesk',
        'subscribe_vendor_support_endpoint': 'subscribeVendorSupportDesk',
        'get_vendor_support_subscriptions': 'fetchSupportDeskSubscriptions',
        'get_support_tickets': 'fetchSupportTickets',
        'create_support_ticket_endpoint': 'createSupportTicket',
        'update_support_ticket_endpoint': 'updateSupportTicket',
        'mutate_support_ticket_booking': 'mutateSupportTicketBooking',
        'mutate_ticket_booking_endpoint': 'mutateSupportTicketBooking',
        'get_support_desk_overview': 'fetchSupportDeskOverview',
        'get_regional_staffing_pods': 'fetchRegionalStaffingPods',
        'resolve_inbound_voice_call': 'resolveInboundVoiceCall',
        'evaluate_automated_sla_triggers': 'evaluateAutomatedSlaTriggers',
        'evaluate_sla_triggers_endpoint': 'evaluateAutomatedSlaTriggers',
        
        # Stripe Subscriptions & Billing
        'get_vendor_subscription': 'fetchVendorSubscription',
        'get_vendor_subscription_details': 'fetchVendorSubscription',
        'create_vendor_billing_portal': 'createVendorBillingPortalSession',
        'switch_vendor_pay_as_you_go': 'switchVendorPayAsYouGoApi',
        'switch_vendor_to_pay_as_you_go': 'switchVendorPayAsYouGoApi',
        'upgrade_vendor_subscription': 'upgradeVendorSubscriptionApi',
        'cancel_vendor_subscription': 'cancelVendorSubscriptionApi',
        'simulate_vendor_dunning_alert': 'simulateVendorDunningAlertApi',
        'trigger_dunning_test_alert': 'simulateVendorDunningAlertApi',
        'clear_vendor_dunning_alert': 'clearVendorDunningAlertApi',
        'get_vendor_stripe_connect_status': 'fetchVendorStripeConnectStatusApi',
        'get_vendor_stripe_status': 'fetchVendorStripeStatus',
        'create_vendor_stripe_connect_link': 'createVendorStripeConnectLink',
        'create_vendor_stripe_login_link': 'createVendorStripeLoginLink',
        'get_vendor_payouts_ledger': 'fetchVendorPayoutsLedger',
        'webhook_stripe': 'simulateStripeWebhookApi',

        # Voice AI & Telephony (Sprint 2)
        'simulate_voice_call': 'simulateVoiceCallApi',
        'get_voice_session': 'fetchVoiceSessionApi',
        'voice_call_intake': 'executeVoiceCallIntakeApi',
        'execute_voice_call_intake': 'executeVoiceCallIntakeApi',
        'process_inbound_sms_compliance': 'processInboundSmsComplianceApi',
        'get_vendor_telecom_compliance': 'fetchVendorTelecomCompliance',
        'register_vendor_brand': 'registerVendor10DlcBrand',
        'register_vendor_telecom_brand': 'registerVendor10DlcBrand',
        'get_omnichannel_desk_workspace': 'fetchOmnichannelWorkspaceApi',
        'get_vendor_omnichannel_desk': 'fetchOmnichannelWorkspaceApi',
        'send_omnichannel_message': 'sendOmnichannelMessageApi',
        'send_omnichannel_chat_message': 'sendOmnichannelMessageApi',
        'send_whatsapp_message': 'sendWhatsAppMessage',
        'send_sms_message': 'sendSmsMessage',
        'record_voice_studio_call': 'recordVoiceStudioCallApi',
        'update_vendor_omnichannel_config': 'updateVendorOmnichannelConfigApi',
        
        # Vendor Branding & Cell Partition (Sprint 2)
        'get_vendor_cell_status': 'fetchVendorCellStatusApi',
        'toggle_vendor_cell_circuit_breaker': 'toggleVendorCellCircuitBreakerApi',
        'sync_vendor_outbox_to_global_hub': 'syncVendorOutboxToGlobalHubApi',
        'list_vendor_cells': 'listVendorCellsApi',
        'get_vendor_manifest_template': 'fetchVendorManifestTemplateApi',
        'validate_vendor_yaml': 'validateVendorYamlApi',
        'spin_up_vendor_cell': 'spinUpVendorCellApi',
        'get_global_hub_analytics': 'fetchGlobalHubAnalyticsApi',
        'get_system_runtime_mode': 'fetchSystemRuntimeModeApi',
        'create_direct_cell_booking': 'executeDirectCellBookingApi',
        'resolve_vendor_domain': 'resolveVendorDomainApi',
        'resolve_vendor_token': 'resolveVendorPortalTokenApi',
        'generate_vendor_token': 'generateVendorPortalTokenApi',
        'get_vendor_branding_settings': 'fetchVendorBrandingSettingsApi',
        'update_vendor_branding_settings': 'updateVendorBrandingSettingsApi',
        'get_vendor_intake_config': 'fetchVendorIntakeConfigApi',
        'update_vendor_intake_config': 'updateVendorIntakeConfigApi',
        'get_vendor_schedule': 'fetchVendorOperatingScheduleApi',
        'update_vendor_schedule': 'updateVendorOperatingScheduleApi',
        'get_vendor_seo_schema': 'fetchVendorSeoSchemaApi',
        'get_vendor_email_config': 'fetchVendorEmailConfigApi',
        'update_vendor_email_config': 'updateVendorEmailConfigApi',
        'test_vendor_email_connection': 'testVendorEmailConnectionApi',
        'test_vendor_inbound_email_connection': 'testVendorInboundEmailConnectionApi',
        'get_vendor_email_inbox': 'fetchVendorEmailInboxApi',
        'convert_email_rfq_to_booking': 'convertEmailRfqToBookingApi',
        'send_vendor_trip_invoice': 'sendVendorTripInvoiceEmailApi',
        'send_vendor_invoice_endpoint': 'sendVendorInvoiceFromHubApi',
        'parse_vendor_inbound_email': 'parseVendorInboundEmailApi',
        'dispatch_vendor_outbound_email': 'dispatchVendorOutboundEmailApi',
        'export_invoice_csv': 'exportCorporateInvoiceCsvApi',
        'export_corporate_invoice_csv': 'exportCorporateInvoiceCsvApi',
        'get_hub_helicopter_config_endpoint': 'fetchHelicopterHubConfig',
        'update_hub_helicopter_config_endpoint': 'updateHelicopterHubConfig',

        # Sprint 3: Autonomous Recovery, FlightAware & Mission Control
        'get_vendor_ai_yield': 'fetchVendorAiYieldApi',
        'train_vendor_ai_yield': 'trainVendorAiYieldApi',
        'apply_vendor_ai_yield': 'applyVendorAiYieldApi',
        'check_fleet_availability': 'checkFleetAvailabilityApi',
        'get_vendor_simulation_scenarios': 'fetchVendorSimulationScenariosApi',
        'get_pricing_simulation_scenarios': 'fetchVendorSimulationScenariosApi',
        'save_pricing_simulation_scenario': 'savePricingSimulationScenarioApi',
        'invoke_shared_ai_gateway': 'invokeSharedAiGatewayApi',
        'broadcast_flight_radar_event': 'broadcastFlightRadarEventApi',
        'webhook_flightaware': 'ingestFlightAwareWebhookApi',
        'list_radar_stream': 'fetchTransitRadarStream',
        'get_cell_domain_mapping': 'fetchCellDomainMappingApi',
        'update_cell_domain_mapping': 'updateCellDomainMappingApi',
        'add_document': 'addAiDocumentApi',
        'edge': 'addAiGraphEdgeApi',

        # Sprint 4: Bookings, Inbound Leads, Reservations & Chauffeur Operations
        'lookup_customer_bookings': 'lookupBookingsApi',
        'get_booking_calendar_ics': 'getBookingCalendarIcsUrl',
        'get_booking_live_tracking': 'fetchBookingLiveTrackingApi',
        'get_trip_live_tracking': 'fetchTripLiveTrackingApi',
        'submit_sourcing_inquiry': 'submitSourcingInquiry',
        'create_phone_intake_booking': 'createManualPhoneBooking',
        'dispatch_quick_quote': 'fetchQuickPhoneQuote',
        'convert_inquiry_to_booking': 'convertInquiryToBookingApi',
        'trigger_inquiry_drip': 'triggerInquiryDripApi',
        'list_regional_pods_endpoint': 'fetchRegionalStaffingPods',
        'list_vendor_bookings': 'fetchVendorBookingsApi',
        'list_vendor_inquiries': 'fetchVendorInquiriesApi',
        'get_chauffeur_duty_status': 'fetchChauffeurDutyStatusApi',
        'accept_offer': 'acceptDriverOffer',
        'update_trip_event': 'updateTripStatus',
        'list_vendor_drivers': 'fetchVendorDriversApi',
        'create_vendor_driver': 'createVendorDriverApi',

        # Sprint 5: Dynamic Pricing, Instant Quotations, AI Validation & Global Affiliate Network
        'quote_multi_modal_itinerary': 'quoteMasterItinerary',
        'quote_multi_modal_itinerary_matrix': 'quoteMasterItineraryMatrix',
        'get_regional_tax_rules': 'fetchRegionalTaxRulesApi',
        'ai_validate_pricing_quote': 'aiValidatePricingQuoteApi',
        'accept_and_book': 'bookQuote',
        'book_multi_modal_itinerary': 'bookItinerary',
        'submit_vendor_quote': 'submitVendorQuoteApi',
        'ai_validate_vendor_pricing': 'aiValidateVendorPricingApi',
        'get_global_hub_affiliates_knowledge_base': 'fetchGlobalHubKnowledgeBase',
        'farm_out_ride_to_affiliate': 'farmOutAffiliateRide',
        'get_affiliate_recommendations_for_ride': 'fetchAffiliateRecommendations',
        'get_global_affiliate_directory': 'fetchGlobalAffiliateDirectory',
        'get_vendor_affiliate_records': 'fetchVendorAffiliateRecords',
        'get_vendor_affiliate_policy': 'fetchVendorAffiliatePolicy',
        'update_vendor_affiliate_policy': 'updateVendorAffiliatePolicy',
        'evaluate_multileg_affiliate_strategy': 'evaluateVendorMultilegStrategy',

        # Sprint 6: Fleet Assets & Vehicle Inventory + Payroll, Shifts & Settlements
        'list_vehicles': 'fetchAllVehicles',
        'get_vendor_vehicle_detail': 'fetchVendorVehicleDetail',
        'toggle_vendor_vehicle_active': 'toggleVehicleActive',
        'toggle_vendor_vehicle_network': 'toggleVehicleNetwork',
        'export_vendor_payroll_csv': 'exportPayrollCsvApi',
        'process_trip_payout': 'processTripPayoutApi',
        'record_driver_shift': 'recordDriverShiftApi',
        'get_vendor_payroll_summary': 'fetchVendorPayrollSummaryApi'
    }

    analyzed_endpoints = []

    for ep in endpoints:
        path = ep['path']
        methods = ep['methods']
        func_name = ep['func_name']
        doc = ep['doc']

        # Determine wrapper
        wrapper = None
        if func_name in function_to_wrapper and function_to_wrapper[func_name] in all_api_exports:
            wrapper = function_to_wrapper[func_name]
        elif func_name in all_api_exports:
            wrapper = func_name
        else:
            camel = ''.join(word.capitalize() if i > 0 else word for i, word in enumerate(func_name.split('_')))
            fetch_camel = 'fetch' + ''.join(word.capitalize() for word in func_name.split('_') if word not in ('get', 'list'))
            if camel in all_api_exports:
                wrapper = camel
            elif fetch_camel in all_api_exports:
                wrapper = fetch_camel

        # UI callers
        ui_callers = []
        clean_path = re.sub(r'\{[^}]+\}', '', path).rstrip('/')

        for fl, content in ui_files.items():
            if fl == 'api.ts':
                continue
            
            tokens = ui_words[fl]
            used = False
            how = []

            if wrapper and wrapper in tokens:
                used = True
                how.append(f'API wrapper `{wrapper}`')
            if func_name in tokens:
                used = True
                how.append(f'Function `{func_name}`')
            if len(clean_path) > 8 and clean_path in content:
                used = True
                how.append(f'URL `{clean_path}`')

            if used:
                ui_callers.append({
                    'file': fl,
                    'how': ', '.join(how)
                })

        # Subsystem classification
        group = "Other Operations"
        if "branding" in path or "seo" in path or "vendor-portal" in path or "vendor-cell" in path or "vendors/register" in path or "infrastructure/cells" in path or "email" in path:
            group = "Vendor White-Label Branding & Cell Config"
        elif "quote" in path or ("pricing" in path and "simulation" not in path and "ai-yield" not in path):
            group = "Dynamic Pricing & Instant Quotations"
        elif "booking" in path or "reservation" in path or "inquiry" in path or "inquiries" in path or "pod" in path:
            group = "Bookings, Inbound Leads & Reservations"
        elif "fleet" in path or "vehicle" in path:
            group = "Fleet Assets & Vehicle Inventory"
        elif "driver" in path or "chauffeur" in path or "shifts" in path:
            group = "Driver Management & Chauffeur Operations"
        elif "payroll" in path or "payout" in path:
            group = "Payroll, Shifts & Settlements"
        elif "stripe" in path or "subscription" in path or "dunning" in path or "billing" in path:
            group = "Billing, Subscriptions & Stripe Connect"
        elif "affiliate" in path or "farm-out" in path or "vendor-network" in path:
            group = "Global Affiliate Network & Ride Farm-Out"
        elif "voice" in path or "twilio" in path or "telecom" in path or "omnichannel" in path or "ws/voice" in path:
            group = "Voice AI Concierge & Omnichannel Telephony"
        elif "flightaware" in path or "recovery" in path or "yield" in path or "simulation" in path or "/ai" in path or "radar" in path or "shared-ai" in path or "availability" in path:
            group = "Autonomous Recovery & FlightAware Engine"
        elif "support" in path or "ticket" in path:
            group = "Support Ticketing Desk"
        elif "team" in path or "roles" in path or "impersonate" in path:
            group = "Staff, Team & Role Security"
        elif "corporate" in path:
            group = "Corporate Accounts & B2B Portal"
        elif "global-hub" in path or "governance" in path or "settlement" in path:
            group = "Global Hub Governance & Marketplace"

        is_complete = len(ui_callers) > 0
        analyzed_endpoints.append({
            'path': path,
            'methods': methods,
            'func_name': func_name,
            'doc': doc,
            'group': group,
            'wrapper': wrapper,
            'ui_callers': ui_callers,
            'is_complete': is_complete
        })

    groups = {}
    for item in analyzed_endpoints:
        g = item['group']
        if g not in groups:
            groups[g] = {'total': 0, 'completed': 0, 'gaps': 0, 'items': []}
        groups[g]['total'] += 1
        if item['is_complete']:
            groups[g]['completed'] += 1
        else:
            groups[g]['gaps'] += 1
        groups[g]['items'].append(item)

    print("=== SUMMARY OF GAP REPORT BY DOMAIN ===")
    total_eps = len(analyzed_endpoints)
    total_done = sum(1 for x in analyzed_endpoints if x['is_complete'])
    total_gap = total_eps - total_done
    print(f"Total APIs: {total_eps} | Total UI Connected: {total_done} | Total UI GAPs: {total_gap}")
    print("-" * 75)
    for g, data in sorted(groups.items()):
        pct = (data['completed'] / data['total']) * 100
        print(f"{g:<50s} | Total: {data['total']:3d} | Done: {data['completed']:3d} | GAPs: {data['gaps']:3d} ({pct:5.1f}%)")

    with open('scratch/comprehensive_gap_report.json', 'w', encoding='utf-8') as out:
        json.dump({
            'total_apis': total_eps,
            'total_ui_connected': total_done,
            'total_gaps': total_gap,
            'groups': groups
        }, out, indent=2)
    print("\nSaved scratch/comprehensive_gap_report.json")

if __name__ == '__main__':
    build_report()
