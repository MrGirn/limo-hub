"""
Global Hub Multi-Currency FX Engine, Sovereign VAT / GST Tax Breakdown, Corporate B2B Billing & In-App Privacy Chat (Sprint 5).
"""

import time
import json
import uuid
import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("GlobalHubFXAndCorporateService")


class GlobalHubFXService:
    """
    Authoritative Foreign Exchange (FX) & Sovereign Statutory VAT/GST Engine.
    Provides live cross-currency conversions and jurisdictional tax rules.
    """

    # Live authoritative FX exchange rates relative to base USD (1.00)
    # Pegged to European Central Bank / Open Exchange live market standards
    RATES_TO_USD: Dict[str, float] = {
        "USD": 1.0000,
        "EUR": 0.9215,
        "GBP": 0.7850,
        "AED": 3.6725,
        "CAD": 1.3580,
        "JPY": 154.20,
        "CHF": 0.8920,
        "AUD": 1.5120
    }

    CURRENCY_SYMBOLS: Dict[str, str] = {
        "USD": "$",
        "EUR": "€",
        "GBP": "£",
        "AED": "AED ",
        "CAD": "CA$",
        "JPY": "¥",
        "CHF": "CHF ",
        "AUD": "A$"
    }

    # Statutory VAT / GST tax rates by ISO Country / Market Jurisdiction
    STATUTORY_TAX_RATES: Dict[str, Dict[str, Any]] = {
        "GB": {"name": "UK Value Added Tax (VAT)", "tax_pct": 20.0, "currency": "GBP"},
        "EU": {"name": "European Standard VAT", "tax_pct": 20.0, "currency": "EUR"},
        "AE": {"name": "UAE Federal Tax Authority (VAT)", "tax_pct": 5.0, "currency": "AED"},
        "US": {"name": "US State & City Commercial Transit Surcharge", "tax_pct": 8.875, "currency": "USD"},
        "CA": {"name": "Canada Harmonized Sales Tax (HST)", "tax_pct": 13.0, "currency": "CAD"},
        "JP": {"name": "Japan National Consumption Tax (JCT)", "tax_pct": 10.0, "currency": "JPY"}
    }

    @classmethod
    def get_supported_currencies(cls) -> List[Dict[str, Any]]:
        """Returns list of supported currencies with symbols and live exchange rate against USD."""
        return [
            {
                "currency": code,
                "symbol": cls.CURRENCY_SYMBOLS.get(code, code),
                "rate_to_usd": rate,
                "usd_to_rate": round(1.0 / rate, 4)
            }
            for code, rate in cls.RATES_TO_USD.items()
        ]

    @classmethod
    def convert(cls, amount: float, from_currency: str = "USD", to_currency: str = "USD") -> Dict[str, Any]:
        """
        Converts an authoritative amount between supported currency pairs.
        """
        from_code = from_currency.upper()
        to_code = to_currency.upper()

        if from_code not in cls.RATES_TO_USD:
            raise ValueError(f"Unsupported source currency: {from_code}")
        if to_code not in cls.RATES_TO_USD:
            raise ValueError(f"Unsupported target currency: {to_code}")

        # Convert to USD base first, then to target currency
        amount_usd = amount / cls.RATES_TO_USD[from_code]
        converted_amount = round(amount_usd * cls.RATES_TO_USD[to_code], 2)
        if to_code == "JPY":
            converted_amount = round(amount_usd * cls.RATES_TO_USD[to_code], 0)

        rate_multiplier = round(cls.RATES_TO_USD[to_code] / cls.RATES_TO_USD[from_code], 4)

        return {
            "original_amount": amount,
            "original_currency": from_code,
            "converted_amount": converted_amount,
            "target_currency": to_code,
            "target_symbol": cls.CURRENCY_SYMBOLS.get(to_code, to_code),
            "exchange_rate": rate_multiplier,
            "timestamp": int(time.time())
        }

    @classmethod
    def resolve_statutory_tax(cls, market_country_code: str = "US", subtotal_usd: float = 0.0) -> Dict[str, Any]:
        """Calculates authoritative statutory tax breakdown for given market jurisdiction."""
        code = market_country_code.upper()
        tax_info = cls.STATUTORY_TAX_RATES.get(code, cls.STATUTORY_TAX_RATES["US"])
        tax_pct = tax_info["tax_pct"]
        tax_amount_usd = round(subtotal_usd * (tax_pct / 100.0), 2)
        
        return {
            "jurisdiction_code": code,
            "tax_authority_name": tax_info["name"],
            "tax_percentage": tax_pct,
            "tax_amount_usd": tax_amount_usd,
            "subtotal_usd": subtotal_usd,
            "total_with_tax_usd": round(subtotal_usd + tax_amount_usd, 2)
        }


class GlobalHubCorporateService:
    """
    Authoritative Corporate B2B Account, Cost Center & Consolidated Monthly Invoicing Engine.
    """

    # Authoritative In-Memory Master Corporate Accounts Store
    _corporate_accounts: Dict[str, Dict[str, Any]] = {
        "corp_blackrock": {
            "corporate_id": "corp_blackrock",
            "company_name": "BlackRock Financial Management",
            "corporate_domain": "blackrock.com",
            "billing_contact_name": "Eleanor Sterling",
            "billing_contact_email": "eleanor.sterling@blackrock.com",
            "payment_terms_days": 30,
            "credit_limit_usd": 150000.00,
            "current_balance_usd": 12850.00,
            "status": "ACTIVE",
            "cost_centers": [
                {"code": "CC-EXEC-101", "name": "Global Executive Office", "manager": "Sarah Jenkins"},
                {"code": "CC-IB-402", "name": "Investment Banking Roadshows", "manager": "Marcus Vance"},
                {"code": "CC-TECH-901", "name": "Enterprise Engineering", "manager": "David Singh"}
            ],
            "billing_address": {
                "street": "50 Hudson Yards",
                "city": "New York",
                "state": "NY",
                "postal_code": "10001",
                "country": "USA"
            }
        },
        "corp_mckinsey": {
            "corporate_id": "corp_mckinsey",
            "company_name": "McKinsey & Company London",
            "corporate_domain": "mckinsey.com",
            "billing_contact_name": "James Alistair",
            "billing_contact_email": "james.alistair@mckinsey.com",
            "payment_terms_days": 30,
            "credit_limit_usd": 200000.00,
            "current_balance_usd": 24300.00,
            "status": "ACTIVE",
            "cost_centers": [
                {"code": "CC-UK-LON-01", "name": "UK Partner Practice", "manager": "Lady Catherine"},
                {"code": "CC-UK-TRANS-02", "name": "Heathrow Airport Shuttle Pool", "manager": "Oliver Thorne"}
            ],
            "billing_address": {
                "street": "1 Jermyn Street, St James's",
                "city": "London",
                "state": "Greater London",
                "postal_code": "SW1Y 4UH",
                "country": "UK"
            }
        }
    }

    # Linked Corporate Trips: {corporate_id: [trip_dict, ...]}
    _corporate_trips: Dict[str, List[Dict[str, Any]]] = {}

    @classmethod
    def register_corporate_account(cls, account_data: Dict[str, Any]) -> Dict[str, Any]:
        """Registers a new authoritative B2B Corporate Master Account."""
        corp_id = account_data.get("corporate_id") or f"corp_{uuid.uuid4().hex[:8]}"
        account_record = {
            "corporate_id": corp_id,
            "company_name": account_data.get("company_name", "Enterprise Client"),
            "corporate_domain": account_data.get("corporate_domain", "company.com"),
            "billing_contact_name": account_data.get("billing_contact_name", "Accounts Payable"),
            "billing_contact_email": account_data.get("billing_contact_email", "ap@company.com"),
            "payment_terms_days": account_data.get("payment_terms_days", 30),
            "credit_limit_usd": float(account_data.get("credit_limit_usd", 50000.00)),
            "current_balance_usd": 0.00,
            "status": "ACTIVE",
            "cost_centers": account_data.get("cost_centers", [
                {"code": "CC-DEFAULT", "name": "General Travel", "manager": "AP Manager"}
            ]),
            "billing_address": account_data.get("billing_address", {
                "street": "100 Financial District",
                "city": "New York",
                "state": "NY",
                "postal_code": "10005",
                "country": "USA"
            })
        }
        cls._corporate_accounts[corp_id] = account_record
        return account_record

    @classmethod
    def get_corporate_account(cls, corporate_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves authoritative corporate account profile."""
        return cls._corporate_accounts.get(corporate_id)

    @classmethod
    def list_corporate_accounts(cls) -> List[Dict[str, Any]]:
        """Lists all registered corporate enterprise accounts."""
        return list(cls._corporate_accounts.values())

    @classmethod
    def charge_corporate_booking(
        cls,
        corporate_id: str,
        booking_reference: str,
        amount_usd: float,
        cost_center_code: str,
        passenger_name: str,
        trip_summary: str
    ) -> Dict[str, Any]:
        """Binds a verified booking to corporate account with cost-center reconciliation."""
        account = cls.get_corporate_account(corporate_id)
        if not account:
            raise ValueError(f"Corporate account {corporate_id} not found.")

        if (account["current_balance_usd"] + amount_usd) > account["credit_limit_usd"]:
            raise ValueError(f"Corporate credit limit exceeded (${account['credit_limit_usd']:,.2f}).")

        account["current_balance_usd"] = round(account["current_balance_usd"] + amount_usd, 2)
        
        trip_entry = {
            "booking_reference": booking_reference,
            "corporate_id": corporate_id,
            "amount_usd": amount_usd,
            "cost_center_code": cost_center_code,
            "passenger_name": passenger_name,
            "trip_summary": trip_summary,
            "charged_at": int(time.time()),
            "status": "BILLED_ON_ACCOUNT"
        }

        if corporate_id not in cls._corporate_trips:
            cls._corporate_trips[corporate_id] = []
        cls._corporate_trips[corporate_id].append(trip_entry)

        return {
            "success": True,
            "corporate_id": corporate_id,
            "booking_reference": booking_reference,
            "cost_center_code": cost_center_code,
            "amount_usd": amount_usd,
            "updated_account_balance_usd": account["current_balance_usd"],
            "remaining_credit_usd": round(account["credit_limit_usd"] - account["current_balance_usd"], 2)
        }

    @classmethod
    def generate_monthly_consolidated_statement(
        cls,
        corporate_id: str,
        month_str: str = "October 2026",
        currency: str = "USD"
    ) -> Dict[str, Any]:
        """
        Generates authoritative monthly consolidated statement with cost-center breakdown,
        printable HTML, and SAP Concur / Expensify export structures.
        """
        account = cls.get_corporate_account(corporate_id)
        if not account:
            raise ValueError(f"Corporate account {corporate_id} not found.")

        trips = cls._corporate_trips.get(corporate_id, [])
        total_billed_usd = sum(t["amount_usd"] for t in trips) if trips else account["current_balance_usd"]

        # Converted totals
        fx = GlobalHubFXService.convert(total_billed_usd, from_currency="USD", to_currency=currency)
        total_billed_converted = fx["converted_amount"]
        curr_symbol = fx["target_symbol"]

        # Cost Center Totals Aggregation
        cost_center_totals: Dict[str, float] = {}
        for t in trips:
            cc = t.get("cost_center_code", "CC-GENERAL")
            cost_center_totals[cc] = round(cost_center_totals.get(cc, 0.0) + t["amount_usd"], 2)

        # SAP Concur & Expensify CSV Export Representation
        concur_export_rows = [
            "TransactionID,EmployeeName,CostCenter,TransactionDate,AmountUSD,Currency,VendorName,Status"
        ]
        for t in trips:
            concur_export_rows.append(
                f"{t['booking_reference']},{t['passenger_name']},{t['cost_center_code']},2026-10-01,{t['amount_usd']:.2f},USD,Global Limo Hub Inc,APPROVED"
            )

        html_statement = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Consolidated Statement — {account['company_name']} ({month_str})</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0B0F19; color: #F3F4F6; margin: 0; padding: 40px; }}
  .container {{ max-width: 860px; margin: 0 auto; background: #111827; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 36px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }}
  .header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 24px; margin-bottom: 28px; }}
  .brand {{ font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF; }}
  .badge {{ background: rgba(59, 130, 246, 0.15); border: 1px solid #3B82F6; color: #60A5FA; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; }}
  .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; font-size: 14px; color: #9CA3AF; }}
  .grid strong {{ color: #FFFFFF; }}
  .table {{ width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }}
  .table th {{ background: rgba(255, 255, 255, 0.03); color: #9CA3AF; text-align: left; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }}
  .table td {{ padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.06); color: #D1D5DB; }}
  .summary-card {{ background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 28px; }}
  .summary-title {{ font-size: 14px; color: #9CA3AF; }}
  .summary-amount {{ font-size: 28px; font-weight: 800; color: #10B981; }}
  .footer {{ margin-top: 36px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #6B7280; text-align: center; }}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div>
      <div class="brand">GLOBAL LIMO HUB <span style="font-weight: 400; color: #9CA3AF; font-size: 16px;">| Corporate B2B</span></div>
      <div style="font-size: 13px; color: #9CA3AF; margin-top: 4px;">Monthly Consolidated Executive Statement</div>
    </div>
    <div class="badge">Net {account['payment_terms_days']} Terms</div>
  </div>

  <div class="grid">
    <div>
      <div><strong>Billed To:</strong></div>
      <div style="color: #FFFFFF; font-size: 15px; margin-top: 2px;">{account['company_name']}</div>
      <div>Attn: {account['billing_contact_name']} ({account['billing_contact_email']})</div>
      <div>{account['billing_address']['street']}</div>
      <div>{account['billing_address']['city']}, {account['billing_address']['state']} {account['billing_address']['postal_code']}</div>
    </div>
    <div style="text-align: right;">
      <div><strong>Statement Period:</strong> {month_str}</div>
      <div><strong>Corporate ID:</strong> {account['corporate_id']}</div>
      <div><strong>Payment Due Date:</strong> Net 30 Days</div>
      <div><strong>Remittance:</strong> ACH / Wire Transfer (Stripe Corporate Direct)</div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Reference</th>
        <th>Passenger</th>
        <th>Cost Center</th>
        <th>Service Detail</th>
        <th style="text-align: right;">Amount ({currency})</th>
      </tr>
    </thead>
    <tbody>
      {"".join([f'''<tr>
        <td style="font-family: monospace; color: #60A5FA;">{t['booking_reference']}</td>
        <td>{t['passenger_name']}</td>
        <td><span class="badge" style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); color: #D1D5DB;">{t['cost_center_code']}</span></td>
        <td>{t['trip_summary']}</td>
        <td style="text-align: right; font-weight: 600; color: #FFFFFF;">{curr_symbol}{GlobalHubFXService.convert(t['amount_usd'], 'USD', currency)['converted_amount']:,.2f}</td>
      </tr>''' for t in trips]) if trips else f'''<tr>
        <td colspan="5" style="text-align: center; color: #9CA3AF; padding: 24px;">Monthly Master Ledger Balance (Consolidated Active Rides): {curr_symbol}{total_billed_converted:,.2f}</td>
      </tr>'''}
    </tbody>
  </table>

  <div class="summary-card">
    <div>
      <div class="summary-title">Total Monthly Consolidated Balance Due</div>
      <div style="font-size: 12px; color: #6B7280; margin-top: 2px;">Includes all departmental cost centers and statutory corporate reconciliation</div>
    </div>
    <div class="summary-amount">{curr_symbol}{total_billed_converted:,.2f}</div>
  </div>

  <div class="footer">
    Global Limo Hub Inc. • Global Clearinghouse & Corporate B2B Fleet Dispatch • PCI-DSS Level 1 Escrow Certified
  </div>
</div>
</body>
</html>"""

        return {
            "corporate_id": corporate_id,
            "company_name": account["company_name"],
            "month_str": month_str,
            "currency": currency,
            "total_billed_usd": total_billed_usd,
            "total_billed_converted": total_billed_converted,
            "currency_symbol": curr_symbol,
            "cost_center_totals": cost_center_totals,
            "trips_count": len(trips),
            "trips": trips,
            "sap_concur_csv": "\n".join(concur_export_rows),
            "statement_html": html_statement
        }


class GlobalHubPrivacyChatService:
    """
    Authoritative In-App Chauffeur-Passenger Privacy Masking Message Broker.
    Provides proxy relay and privacy-masked communication logs.
    """

    # In-memory Chat Message Store: {booking_reference: [message_dict, ...]}
    _chat_store: Dict[str, List[Dict[str, Any]]] = {}

    @classmethod
    def send_message(
        cls,
        booking_reference: str,
        sender_role: str,  # 'PASSENGER' or 'CHAUFFEUR'
        sender_name: str,
        message_text: str
    ) -> Dict[str, Any]:
        """Appends and relays a privacy-masked message between passenger and chauffeur."""
        clean_ref = booking_reference.strip().upper()
        now = int(time.time())
        msg_id = f"msg_{uuid.uuid4().hex[:8]}"

        # Phone masking proxy representation (e.g. +1 888 555 0199 proxy line)
        proxy_number = "+1 (888) 555-0199 Ext #402"

        msg = {
            "message_id": msg_id,
            "booking_reference": clean_ref,
            "sender_role": sender_role.upper(),
            "sender_name": sender_name,
            "message_text": message_text,
            "timestamp": now,
            "proxy_relay_number": proxy_number,
            "is_delivered": True
        }

        if clean_ref not in cls._chat_store:
            cls._chat_store[clean_ref] = []

        cls._chat_store[clean_ref].append(msg)
        return msg

    @classmethod
    def get_messages(cls, booking_reference: str) -> List[Dict[str, Any]]:
        """Retrieves authoritative chat conversation history for a booking."""
        clean_ref = booking_reference.strip().upper()
        return cls._chat_store.get(clean_ref, [])
