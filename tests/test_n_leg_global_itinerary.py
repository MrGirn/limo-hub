import unittest
from datetime import datetime
from app.domain_models import (
    LegMode, VehicleClass, VendorRegistrationRequest
)
from app.services.itinerary_engine import ItineraryEngine
from app.services.omnichannel_intake_service import OmnichannelIntakeService
from app.services.mcp_server import ModelContextProtocolServer
from app.services.crewai_vendor_dossier_service import CrewAIVendorDossierService

class TestNLegGlobalItineraryEngine(unittest.TestCase):
    def test_multi_leg_nyc_london_itinerary(self):
        """Test a 3-leg NYC Chauffeur -> Flight BA 178 -> London Chauffeur itinerary."""
        raw_legs = [
            {
                "leg_mode": "CHAUFFEUR_RIDE",
                "origin_address": "The Peninsula New York, 700 5th Ave, New York, NY",
                "origin_city": "New York",
                "destination_address": "JFK International Airport Terminal 7, Queens, NY",
                "destination_city": "New York",
                "flight_number": "BA178"
            },
            {
                "leg_mode": "FLIGHT",
                "origin_address": "John F. Kennedy International Airport (JFK)",
                "origin_city": "New York",
                "destination_address": "London Heathrow Airport (LHR)",
                "destination_city": "London",
                "flight_number": "BA178"
            },
            {
                "leg_mode": "CHAUFFEUR_RIDE",
                "origin_address": "Heathrow Airport Terminal 5, Longford, Hounslow",
                "origin_city": "London",
                "destination_address": "The Savoy, Strand, London WC2R 0EZ, United Kingdom",
                "destination_city": "London",
                "flight_number": "BA178"
            }
        ]

        itinerary = ItineraryEngine.build_and_quote_itinerary(
            title="NYC to London Executive Mission",
            raw_legs=raw_legs,
            vehicle_class=VehicleClass.FIRST_CLASS
        )
        
        self.assertEqual(len(itinerary.legs), 3)
        self.assertGreater(itinerary.all_inclusive_total, 0)
        self.assertEqual(itinerary.legs[1].leg_mode, LegMode.FLIGHT)
        self.assertIn("US", itinerary.countries_spanned)
        self.assertIn("UK", itinerary.countries_spanned)

    def test_omnichannel_whatsapp_enquiry_parsing(self):
        """Test NLP intake from WhatsApp message."""
        raw_text = """
        Passenger: Eleanor Vance
        Need a luxury chauffeur ride tomorrow at 8am.
        Leg 1: Four Seasons Hotel Miami to Miami Executive Airport
        Leg 2: Flight BA 178 from Miami to London Heathrow
        Leg 3: London Heathrow to The Savoy Hotel London
        """

        parsed = OmnichannelIntakeService.parse_inbound_itinerary_message(
            channel="WHATSAPP",
            sender="+19175550199",
            raw_text=raw_text
        )
        self.assertEqual(parsed["passenger_name"], "Eleanor Vance")
        self.assertTrue(len(parsed["itinerary"].legs) >= 2)
        self.assertTrue(parsed["provenance"])

    def test_mcp_quote_tool(self):
        """Test MCP Tool quote_multi_modal_itinerary."""
        tools = ModelContextProtocolServer.get_tools()
        self.assertTrue(any(t["name"] == "quote_multi_modal_itinerary" for t in tools))

        result = ModelContextProtocolServer.execute_tool("quote_multi_modal_itinerary", {
            "title": "Beverly Hills to LAX VIP",
            "vehicle_class": "FIRST_CLASS",
            "legs": [
                {
                    "leg_mode": "CHAUFFEUR_RIDE",
                    "origin_address": "Beverly Hills Hotel, CA",
                    "origin_city": "Los Angeles",
                    "destination_address": "LAX Tom Bradley International Terminal",
                    "destination_city": "Los Angeles"
                }
            ]
        })
        self.assertEqual(result["status"], "success")
        self.assertIn("itinerary", result)
        self.assertGreater(result["itinerary"]["all_inclusive_total"], 0)

    def test_crewai_vendor_vetting(self):
        """Test autonomous vendor compliance vetting."""
        req = VendorRegistrationRequest(
            company_name="Royal Chauffeur London Ltd",
            legal_name="Royal Chauffeur London Limited",
            tax_id="GB989218821",
            contact_email="dispatch@royalchauffeur.co.uk",
            contact_phone="+442081234567",
            depot_address="Heathrow Hub, Nelson Road, Hounslow",
            city="London",
            state_province="Greater London",
            country_code="GB",
            postal_code="TW6 2GW",
            fleet_count=18,
            tlc_or_operating_license="TFL-00912-PHV",
            insurance_policy_number="TFL-LVO-98921-2026"
        )
    def test_vendor_standalone_vs_federated_mode(self):
        """Test vendor operating in Standalone vs Global Network Federated mode."""
        from app.services.vendor_network_service import VendorNetworkService
        from app.domain_models import VendorOperatingMode

        # Set vendor to Standalone Mode
        cfg = VendorNetworkService.update_vendor_config("vendor-ny-executive", {
            "operating_mode": VendorOperatingMode.STANDALONE_PRIVATE
        })
        self.assertEqual(cfg.operating_mode, VendorOperatingMode.STANDALONE_PRIVATE)

        # Phone intake in standalone mode restricts to local market
        res = VendorNetworkService.process_voice_call_intake(
            vendor_id="vendor-ny-executive",
            caller_phone="+19175550199",
            speech_text="Need ride from Peninsula Hotel to JFK Terminal 7 and then London Heathrow to Savoy.",
            auto_confirm_and_book=False
        )
        self.assertEqual(res["operating_mode"], "STANDALONE_PRIVATE")
        self.assertEqual(len(res["itinerary"]["legs"]), 1) # Only local NY leg quoted

        # Switch back to Global Network Federated Mode
        cfg2 = VendorNetworkService.update_vendor_config("vendor-ny-executive", {
            "operating_mode": VendorOperatingMode.GLOBAL_NETWORK_FEDERATED
        })
        self.assertEqual(cfg2.operating_mode, VendorOperatingMode.GLOBAL_NETWORK_FEDERATED)

    def test_real_time_voice_call_quote_and_booking(self):
        """Test real-time conversational phone intake with immediate booking confirmation."""
        from app.services.vendor_network_service import VendorNetworkService

        res = VendorNetworkService.process_voice_call_intake(
            vendor_id="vendor-ny-executive",
            caller_phone="+19175550199",
            speech_text="Hi, I need an Escalade tomorrow at 4pm from The Peninsula Hotel to JFK Terminal 7 for Sir Arthur Davies.",
            customer_name="Sir Arthur Davies",
            customer_email="arthur@davies-holdings.co.uk",
            auto_confirm_and_book=True
        )

        self.assertTrue(res["success"])
        self.assertIn("all-inclusive guaranteed rate", res["voice_spoken_response"])
        self.assertEqual(res["payment_status"], "AUTHORIZED_PRE_AUTH")
        self.assertIsNotNone(res["booking"])
        self.assertIn("Trip ID", res["voice_spoken_response"])

    def test_inter_vendor_job_settlement(self):
        """Test inter-vendor job dispatch and commission breakdown."""
        from app.services.vendor_network_service import VendorNetworkService
        jobs = VendorNetworkService.list_network_jobs("vendor-ny-executive")
        self.assertGreaterEqual(len(jobs), 1)
        j = jobs[0]
        self.assertGreater(j["servicing_payout_net"], 0)
        self.assertGreater(j["originating_commission_net"], 0)

if __name__ == "__main__":
    unittest.main()

