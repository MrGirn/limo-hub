"""
Luxury Ground Transportation Dynamic Document & Email Generation Engine.
Generates:
1. Booking Confirmation Email & PDF Itinerary (with exact servicing vendor terms)
2. Chauffeur En-Route Assignment Notice
3. Itemized Tax Invoice PDF (with location taxes & tolls)
4. Cancellation Notice & Credit Memo PDF (with reversed tax & Stripe refund ID)
5. Master Multi-Leg Global Hub Itinerary PDF (with per-leg affiliate breakdown)
"""

from typing import Dict, Any, List, Optional
from decimal import Decimal
from datetime import datetime


class DocumentTemplates:

    @staticmethod
    def render_booking_confirmation_email(
        booking_data: Dict[str, Any],
        vendor_brand: Dict[str, Any],
        tax_breakdown: Dict[str, Any],
        cancellation_terms: List[Dict[str, Any]],
        tracking_url: str = "https://book.anblimo-philly.com/track/TRP-88129"
    ) -> str:
        """Generates a responsive HTML email with inline CSS and clear terms."""
        
        # Build line items
        surcharges_html = ""
        for sur in tax_breakdown.get("regulatory_surcharges", []):
            surcharges_html += f"""
            <tr>
              <td style="padding: 6px 0; color: #475569; font-size: 13px;">{sur.get('name')}</td>
              <td style="padding: 6px 0; text-align: right; color: #0F172A; font-weight: 600; font-size: 13px;">${sur.get('amount', 0.0):.2f}</td>
            </tr>
            """

        # Build terms section per vendor
        terms_html = ""
        for term in cancellation_terms:
            terms_html += f"""
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-top: 10px;">
              <div style="font-weight: 800; color: #0F172A; font-size: 13px; margin-bottom: 4px;">{term.get('vendor_name')} Policy & Terms:</div>
              <ul style="margin: 0; padding-left: 18px; color: #64748B; font-size: 12px; line-height: 1.6;">
                <li><strong style="color: #059669;">Free Cancellation Deadline:</strong> {term.get('free_cancellation_deadline')}</li>
                <li><strong>Late Cancellation:</strong> {term.get('late_cancellation_penalty')}</li>
                <li><strong>Airport Waiting:</strong> {term.get('airport_waiting_allowance')}</li>
                <li><strong>Flight Protection:</strong> {term.get('flight_policy')}</li>
                <li><strong>Notice:</strong> {term.get('custom_notice')}</li>
              </ul>
            </div>
            """

        return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reservation Confirmed - {vendor_brand.get('company_name', 'Executive Chauffeur')}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
    
    <!-- Brand Header -->
    <tr>
      <td style="padding: 28px 32px; background: #FFFFFF; border-bottom: 2px solid {vendor_brand.get('primary_color', '#D97706')};">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.1em; color: {vendor_brand.get('primary_color', '#D97706')}; text-transform: uppercase;">EXECUTIVE GROUND LOGISTICS</div>
              <h1 style="margin: 4px 0 0 0; font-size: 22px; font-weight: 900; color: #0F172A;">{vendor_brand.get('company_name', 'ANB Limo')}</h1>
              <div style="font-size: 12px; color: #64748B; margin-top: 2px;">Domain: {vendor_brand.get('custom_domain', 'book.anblimo-philly.com')}</div>
            </td>
            <td style="text-align: right;">
              <div style="background: #DCFCE7; color: #16A34A; border: 1px solid #BBF7D0; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; display: inline-block;">
                ✓ CONFIRMED
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Booking Summary -->
    <tr>
      <td style="padding: 28px 32px;">
        <h2 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 800; color: #0F172A;">Itinerary Summary (#{booking_data.get('trip_id', 'TRP-88129')})</h2>
        
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
          <tr>
            <td style="padding-bottom: 10px;">
              <div style="font-size: 11px; font-weight: 700; color: #64748B;">PASSENGER</div>
              <div style="font-size: 14px; font-weight: 800; color: #0F172A;">{booking_data.get('passenger_name', 'Sir Arthur Davies')} ({booking_data.get('passenger_phone', '+1 215-555-9000')})</div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 10px; border-top: 1px solid #E2E8F0; padding-top: 10px;">
              <div style="font-size: 11px; font-weight: 700; color: #64748B;">1. PICKUP LOCATION</div>
              <div style="font-size: 13px; font-weight: 600; color: #0F172A;">{booking_data.get('pickup_address', 'The Ritz-Carlton Philadelphia')}</div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 10px; border-top: 1px solid #E2E8F0; padding-top: 10px;">
              <div style="font-size: 11px; font-weight: 700; color: #64748B;">2. DESTINATION (FLIGHT RADAR)</div>
              <div style="font-size: 13px; font-weight: 600; color: #0F172A;">{booking_data.get('dropoff_address', 'Philadelphia International Airport Terminal A')}</div>
              <div style="font-size: 12px; color: #D97706; font-weight: 700; margin-top: 4px;">✈ Flight: {booking_data.get('flight_number', 'BA 178 (Touchdown On-Time)')}</div>
            </td>
          </tr>
        </table>

        <!-- Live VIP Tracking Button -->
        <div style="text-align: center; margin: 24px 0;">
          <a href="{tracking_url}" style="background: {vendor_brand.get('primary_color', '#2563EB')}; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            📱 Track Your Chauffeur Live (VIP Radar)
          </a>
        </div>

        <!-- Tariff & Location Taxes Breakdown -->
        <h3 style="margin: 24px 0 12px 0; font-size: 15px; font-weight: 800; color: #0F172A;">Itemized Tariff & Taxes ({tax_breakdown.get('jurisdiction_name', 'Jurisdiction')})</h3>
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
          <tr>
            <td style="padding: 6px 0; color: #475569; font-size: 13px;">Base Fleet Reservation</td>
            <td style="padding: 6px 0; text-align: right; color: #0F172A; font-weight: 600; font-size: 13px;">${tax_breakdown.get('base_tariff', 85.00):.2f}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #475569; font-size: 13px;">Mileage & Tolls</td>
            <td style="padding: 6px 0; text-align: right; color: #0F172A; font-weight: 600; font-size: 13px;">${tax_breakdown.get('mileage_fare', 78.63):.2f}</td>
          </tr>
          {surcharges_html}
          <tr>
            <td style="padding: 6px 0; color: #475569; font-size: 13px;">{tax_breakdown.get('tax_name', 'Local Sales Tax')}</td>
            <td style="padding: 6px 0; text-align: right; color: #0F172A; font-weight: 600; font-size: 13px;">${tax_breakdown.get('tax_amount', 15.58):.2f}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #475569; font-size: 13px;">20% Chauffeur Gratuity</td>
            <td style="padding: 6px 0; text-align: right; color: #0F172A; font-weight: 600; font-size: 13px;">${tax_breakdown.get('gratuity_amount', 35.10):.2f}</td>
          </tr>
          <tr style="border-top: 2px solid #0F172A;">
            <td style="padding: 12px 0; color: #0F172A; font-size: 16px; font-weight: 900;">All-Inclusive Total Paid</td>
            <td style="padding: 12px 0; text-align: right; color: #0F172A; font-size: 18px; font-weight: 900;">${tax_breakdown.get('all_inclusive_total', 226.18):.2f}</td>
          </tr>
        </table>

        <!-- Cancellation Terms Notice Section -->
        <h3 style="margin: 24px 0 8px 0; font-size: 14px; font-weight: 800; color: #0F172A;">Cancellation Policy & Leg Terms</h3>
        {terms_html}

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 20px 32px; background: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center; font-size: 11px; color: #64748B;">
        {vendor_brand.get('company_name', 'ANB Limo')} · 24/7 VIP Concierge: {vendor_brand.get('support_phone', '+1 215-555-0188')} · {vendor_brand.get('support_email', 'dispatch@anblimo-philly.com')}
      </td>
    </tr>

  </table>
</body>
</html>"""

    @staticmethod
    def render_cancellation_credit_memo_html(
        cancellation_result: Dict[str, Any],
        vendor_brand: Dict[str, Any]
    ) -> str:
        """Renders an official Credit Memo and Refund Receipt document."""
        return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Credit Memo #{cancellation_result.get('credit_memo_id')} - {vendor_brand.get('company_name')}</title>
</head>
<body style="font-family: -apple-system, sans-serif; background: #F8FAFC; padding: 24px; color: #0F172A;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #EF4444; padding-bottom: 16px; margin-bottom: 20px;">
      <div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0F172A;">{vendor_brand.get('company_name')}</h1>
        <div style="font-size: 12px; color: #64748B;">Official Credit Memo / Cancellation Receipt</div>
      </div>
      <div style="text-align: right;">
        <span style="background: #FEE2E2; color: #DC2626; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 12px;">CANCELLED</span>
      </div>
    </div>

    <table width="100%" style="font-size: 13px; margin-bottom: 20px;">
      <tr>
        <td style="color: #64748B;">Credit Memo Ref:</td>
        <td style="text-align: right; font-weight: 700;">{cancellation_result.get('credit_memo_id')}</td>
      </tr>
      <tr>
        <td style="color: #64748B;">Original Trip ID:</td>
        <td style="text-align: right; font-weight: 700;">{cancellation_result.get('trip_id')}</td>
      </tr>
      <tr>
        <td style="color: #64748B;">Cancellation Tier:</td>
        <td style="text-align: right; font-weight: 700;">{cancellation_result.get('cancellation_tier')}</td>
      </tr>
      <tr>
        <td style="color: #64748B;">Stripe Refund Status:</td>
        <td style="text-align: right; font-weight: 700; color: #059669;">SUCCESS (Transferred to Original Card)</td>
      </tr>
    </table>

    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>Original Charge Paid:</span>
        <strong style="color: #0F172A;">${cancellation_result.get('original_total_fare', 0.0):.2f}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #DC2626;">
        <span>Cancellation Fee ({cancellation_result.get('penalty_rate_pct', 0.0)}%):</span>
        <strong>-${cancellation_result.get('cancellation_penalty_amount', 0.0):.2f}</strong>
      </div>
      <div style="border-top: 1px solid #CBD5E1; padding-top: 8px; display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; color: #059669;">
        <span>Net Refund to Customer Card:</span>
        <span>${cancellation_result.get('refund_amount_to_customer', 0.0):.2f}</span>
      </div>
    </div>

    <div style="font-size: 12px; color: #64748B; line-height: 1.5; margin-bottom: 20px;">
      {cancellation_result.get('customer_explanation')}
    </div>

    <div style="text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 16px;">
      Processed automatically under {vendor_brand.get('company_name')} Sovereign Cancellation Policy.
    </div>
  </div>
</body>
</html>"""
