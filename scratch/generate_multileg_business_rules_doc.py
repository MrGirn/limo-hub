import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_callout_box(doc, text_paragraphs, title="OPERATIONAL RULE", bg_hex="F8FAFC", border_color="0B1B2D"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    tcPr = cell._element.get_or_add_tcPr()
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="36" w:space="0" w:color="{border_color}"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    run_title = p.add_run(f"📌 {title}\n")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(11)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(11, 27, 45)
    
    for tp in text_paragraphs:
        p2 = cell.add_paragraph()
        p2.paragraph_format.space_before = Pt(2)
        p2.paragraph_format.space_after = Pt(4)
        run_txt = p2.add_run(tp)
        run_txt.font.name = "Calibri"
        run_txt.font.size = Pt(10)
        run_txt.font.color.rgb = RGBColor(51, 65, 85)
        
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

def build_document():
    doc = Document()
    
    # Page setup - 0.75 in margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)
        
    # Styles
    navy = RGBColor(11, 27, 45)
    gold = RGBColor(154, 123, 79)
    dark_gray = RGBColor(51, 65, 85)
    
    # Document Title Block
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(4)
    r_title = p_title.add_run("Executive Ground Transportation Architecture")
    r_title.font.name = "Arial"
    r_title.font.size = Pt(12)
    r_title.font.bold = True
    r_title.font.color.rgb = gold
    
    p_main = doc.add_paragraph()
    p_main.paragraph_format.space_before = Pt(0)
    p_main.paragraph_format.space_after = Pt(6)
    r_main = p_main.add_run("Multi-Leg Journeys, Deadhead Economics & Affiliate Farm-Out Rules Engine")
    r_main.font.name = "Georgia"
    r_main.font.size = Pt(22)
    r_main.font.bold = True
    r_main.font.color.rgb = navy
    
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(18)
    r_sub = p_sub.add_run("Strategic Blueprint, Operational Scenarios & Decision Framework for Platform Owners and Sovereign Fleet Operators")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(11)
    r_sub.font.italic = True
    r_sub.font.color.rgb = dark_gray
    
    # Divider line
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(0)
    p_div.paragraph_format.space_after = Pt(14)
    r_div = p_div.add_run("―" * 55)
    r_div.font.color.rgb = RGBColor(226, 232, 240)
    
    # --- SECTION 1: EXECUTIVE SUMMARY ---
    h1 = doc.add_heading("1. Executive Summary & The Core Operational Dilemma", level=1)
    h1.runs[0].font.name = "Georgia"
    h1.runs[0].font.color.rgb = navy
    h1.runs[0].font.size = Pt(15)
    
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(8)
    p.add_run(
        "In the executive chauffeured and livery industry, multi-leg journeys represent both the highest revenue potential "
        "and the greatest operational risk. When a customer in Philadelphia (Vendor A's home market) requests a multi-leg journey "
        "— such as Philadelphia to New York in the morning, followed by an evening return to Philadelphia or a onward trip to Boston — "
        "Vendor A cannot treat the booking as simple disconnected legs without risking severe profit erosion or regulatory violation."
    )
    
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(10)
    p.add_run("Every multi-leg routing decision is governed by three fundamental operational forces:")
    
    # 3 forces list
    f1 = doc.add_paragraph(style='List Bullet')
    r = f1.add_run("Deadhead Economics (Empty Non-Revenue Miles): ")
    r.bold = True
    f1.add_run("Driving 100 miles back empty from Manhattan to Philadelphia consumes ~2 hours, $35 in fuel, $40+ in turnpike/bridge tolls, and unbillable driver wages.")
    
    f2 = doc.add_paragraph(style='List Bullet')
    r = f2.add_run("Federal DOT Hours of Service (HOS): ")
    r.bold = True
    f2.add_run("Under FMCSA regulations, professional chauffeurs are strictly capped at 10 hours of consecutive driving within a 14-hour total on-duty window. An ambitious multi-leg itinerary can easily exceed legal shift boundaries.")
    
    f3 = doc.add_paragraph(style='List Bullet')
    r = f3.add_run("Regulatory Cabotage Laws (NYC TLC vs. PA PPA): ")
    r.bold = True
    f3.add_run("While interstate drop-offs into NYC are federally protected under 49 U.S.C. § 14501, out-of-state chauffeurs are strictly barred from performing independent point-to-point intra-city taxi work inside New York City without NYC TLC credentials.")

    # Callout
    add_callout_box(
        doc, 
        [
            "The goal of the Multi-Leg Business Rules Engine is to automatically evaluate routing, layover duration, driver shift limits, and partner economics to choose between Keeping In-House (Dedicated Wait), Splitting Transfers (Farm-Out Return), or Continuous Charter."
        ],
        title="CORE SYSTEM GOAL"
    )

    # --- SECTION 2: THE 6 MASTER SCENARIOS ---
    h2 = doc.add_heading("2. Comprehensive Real-World Scenario Catalog", level=1)
    h2.runs[0].font.name = "Georgia"
    h2.runs[0].font.color.rgb = navy
    h2.runs[0].font.size = Pt(15)

    scenarios = [
        {
            "num": "Scenario 1",
            "title": "Same-Day Inter-City Roundtrip (PHL ➔ NYC ➔ PHL)",
            "example": "CEO departs Philadelphia at 07:30 AM for a 10:00 AM Manhattan meeting, and needs to return to PHL at 05:00 PM (7-hour layover).",
            "options": [
                ("Option A: Dedicated Chauffeur (Continuous Standby)", "Driver stays on location in Manhattan with vehicle. Passenger leaves belongings/laptop in car. Billed as Outbound Rate + Hourly Standby ($75-$95/hr) + Return Rate. Total Cost: High ($950-$1,250)."),
                ("Option B: Split Relay (Farmed-Out Return)", "Vendor A drives Outbound Leg 1 (PHL ➔ NYC) and returns empty to Philly for afternoon jobs. Return Leg 2 (NYC ➔ PHL at 5:00 PM) is farmed out to a certified NY Affiliate (e.g. Manhattan Prestige). Client gets fresh driver; total cost is lower ($700-$850)."),
                ("Rule Recommendation", "If Layover <= 3.5 Hours -> Keep In-House with Wait Fee. If Layover > 4.0 Hours -> Auto-Suggest Split Farm-Out or Prompt Booker for Dedicated Preference.")
            ]
        },
        {
            "num": "Scenario 2",
            "title": "Forward Multi-City Corridor Chain (PHL ➔ NYC ➔ Boston)",
            "example": "Corporate executive visits NYC office at 09:00 AM, then needs an afternoon transfer from NYC to Boston at 02:00 PM.",
            "options": [
                ("The Operational Problem", "If Vendor A drives all the way to Boston, the vehicle is 320 miles away from Philadelphia (6 hours return deadhead + heavy tolls)."),
                ("Solution 1: Relay Farm-Out", "Vendor A fulfills Leg 1 (PHL ➔ NYC) in-house. Vendor A farms out Leg 2 (NYC ➔ Boston) to a trusted NYC affiliate. Vendor A retains 18%-20% commission on Leg 2 with zero empty-mile liability."),
                ("Solution 2: Full Roadshow Package", "If client demands the same chauffeur throughout, quote includes Chauffeur Overnight Hotel ($250), Meal Per Diem ($75), and 320-mile Return Deadhead Surcharge.")
            ]
        },
        {
            "num": "Scenario 3",
            "title": "Inter-City Drop-Off with Multiple Local Meetings (PHL ➔ NYC Multi-Stop ➔ PHL)",
            "example": "Legal team travels from Philadelphia to Manhattan for 3 depositions: Midtown (10:00 AM), Wall Street (01:30 PM), Brooklyn Navy Yard (04:00 PM), and return to Philly (06:30 PM).",
            "options": [
                ("Legal Cabotage Constraint", "PA-licensed vehicle CANNOT perform disconnected point-to-point fares inside NYC. Doing so risks vehicle impoundment by NYC TLC enforcement."),
                ("Compliant Solution", "Must be booked and invoiced as a Continuous Interstate As-Directed Charter with a single passenger manifest from origin to return under Federal Interstate Commerce protection."),
                ("Pricing Formula", "Flat Day-Rate or Continuous Hourly Rate ($95/hr x 12 hrs = $1,140 + tolls + gratuity).")
            ]
        },
        {
            "num": "Scenario 4",
            "title": "Multi-Day Executive Roadshow (3 to 5 Days)",
            "example": "Investment banking roadshow: Day 1 PHL ➔ Manhattan; Day 2 Manhattan ➔ Greenwich, CT ➔ Boston; Day 3 Boston ➔ Return.",
            "options": [
                ("Option A: Dedicated Chauffeur & Vehicle", "Full vehicle exclusivity. Flat daily rate ($1,600/day for Cadillac Escalade ESV) + Hotel room ($250/night) + Driver meals ($75/day) + actual bridge/highway tolls."),
                ("Option B: Regional Hub Federation", "Each metropolitan segment is dispatched to the premier local sovereign cell in that market (PHL cell -> NY cell -> Boston cell). The client enjoys local expertise in each city at lower total cost.")
            ]
        },
        {
            "num": "Scenario 5",
            "title": "Remote Out-of-Market Booking (100% Affiliate Farm-Out)",
            "example": "A Philadelphia client books a flight to Miami and requests chauffeured airport transfers from Miami International (MIA) to South Beach and back.",
            "options": [
                ("Workflow", "Vendor A accepts booking on their branded portal. Origin is outside Vendor A's market -> System routes to Miami Prestige Chauffeurs via Global Hub."),
                ("Financials", "Vendor A charges client retail rate ($195.00), pays Miami affiliate wholesale net rate ($155.00), and earns $40.00 (20.5% margin) risk-free.")
            ]
        },
        {
            "num": "Scenario 6",
            "title": "Multi-Airport Connecting Flight Transfer",
            "example": "International passenger arrives at JFK at 02:00 PM, has connecting flight from Newark (EWR) at 08:00 PM.",
            "options": [
                ("Fulfillment", "Inter-airport cross-metro transfer. Billed as direct transfer JFK ➔ EWR + luggage assistance + dynamic flight telemetry tracking at both airports.")
            ]
        }
    ]

    for s in scenarios:
        doc.add_heading(f"{s['num']}: {s['title']}", level=2)
        p = doc.add_paragraph()
        r = p.add_run("Use Case: ")
        r.bold = True
        p.add_run(s['example'])
        
        for opt_title, opt_desc in s['options']:
            p_opt = doc.add_paragraph(style='List Bullet')
            r_opt = p_opt.add_run(f"{opt_title}: ")
            r_opt.bold = True
            p_opt.add_run(opt_desc)
        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # --- SECTION 3: DECISION MATRIX TABLE ---
    h3 = doc.add_heading("3. Operational & Financial Decision Matrix", level=1)
    h3.runs[0].font.name = "Georgia"
    h3.runs[0].font.color.rgb = navy
    h3.runs[0].font.size = Pt(15)
    
    p = doc.add_paragraph("The table below summarizes the financial, operational, and customer satisfaction trade-offs across all fulfillment models:")
    p.paragraph_format.space_after = Pt(8)

    table = doc.add_table(rows=6, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    headers = ["Operational Dimension", "Keep In-House (Dedicated Wait)", "Farm-Out to Local Partner", "Hybrid / Split Execution"]
    col_widths = [Inches(1.6), Inches(1.6), Inches(1.6), Inches(1.7)]

    # Style Header Row
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        hdr_cells[i].width = col_widths[i]
        set_cell_background(hdr_cells[i], "0B1B2D")
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=100, right=100)
        p = hdr_cells[i].paragraphs[0]
        p.runs[0].font.name = "Arial"
        p.runs[0].font.size = Pt(9.5)
        p.runs[0].font.bold = True
        p.runs[0].font.color.rgb = RGBColor(255, 255, 255)

    matrix_data = [
        ("Layover Between Legs", "Under 3.5 Hours\n(Wait fee is cost-effective)", "N/A\n(Origin is out of market)", "Over 4.0 Hours\n(Farming out return saves $)"),
        ("Chauffeur Shift (HOS)", "Strictly <= 10 hrs driving\n<= 14 hrs duty window", "Driver stays fresh in their local market", "Frees Outbound driver for afternoon local jobs"),
        ("Deadhead Miles", "Eliminated on return\n(Driver waits on-site)", "Zero deadhead for Vendor A", "Outbound deadhead offset by affiliate return"),
        ("Customer Value", "VIP Continuity:\nSame car & luggage secure", "Seamless booking with 1 invoice", "Optimal price point with zero downtime fee"),
        ("Vendor A Margin", "High Gross Dollars\n($800 - $1,500 billings)", "18% - 25% Pure Margin\nZero asset overhead", "Full margin Leg 1 +\n20% margin Leg 2")
    ]

    for row_idx, row in enumerate(matrix_data, start=1):
        row_cells = table.rows[row_idx].cells
        bg = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, text in enumerate(row):
            row_cells[col_idx].text = text
            row_cells[col_idx].width = col_widths[col_idx]
            set_cell_background(row_cells[col_idx], bg)
            set_cell_margins(row_cells[col_idx], top=80, bottom=80, left=100, right=100)
            p = row_cells[col_idx].paragraphs[0]
            p.runs[0].font.name = "Calibri"
            p.runs[0].font.size = Pt(9)
            p.runs[0].font.color.rgb = dark_gray

    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # --- SECTION 4: CONFIGURABLE BUSINESS RULES ENGINE ---
    h4 = doc.add_heading("4. Configurable Vendor Business Rules (How Vendor A Sets Rules)", level=1)
    h4.runs[0].font.name = "Georgia"
    h4.runs[0].font.color.rgb = navy
    h4.runs[0].font.size = Pt(15)

    p = doc.add_paragraph(
        "To give complete sovereignty to the vendor owner, our platform exposes a dedicated "
        "Multi-Leg & Farm-Out Rule Configuration Panel in the Owner Console. Vendor A can set:"
    )
    p.paragraph_format.space_after = Pt(6)

    rules_list = [
        ("Rule 1: Maximum Layover for Dedicated Standby (Default: 3.5 Hours)", "If the time between Leg 1 drop-off and Leg 2 pickup is <= 3.5 hours, system defaults to Dedicated Chauffeur Wait. If > 3.5 hours, system prompts Split Relay Farm-Out."),
        ("Rule 2: Hourly Standby & Wait Rate (Default: $75.00/hr)", "The billable rate charged per hour of chauffeur standby on inter-city stops."),
        ("Rule 3: Deadhead Return Cost Multiplier (Default: $1.75/km)", "The non-revenue return rate used to calculate whether a roundtrip deadhead is profitable vs. farming out."),
        ("Rule 4: Driver Hours of Service Safety Limit (Default: 12.0 Hours)", "System flags an orange dispatch alert if total estimated on-duty time exceeds 12 hours, and a hard red block at 14 hours."),
        ("Rule 5: Affiliate Commission Target (Default: 18.0%)", "Minimum gross margin Vendor A retains on any leg dispatched through the Global Clearinghouse Network."),
        ("Rule 6: Client Service Level Hierarchy (VIP vs. Standard)", "Bookings tagged as 'VIP C-Suite / Executive' force Dedicated Chauffeur mode, while 'Standard Corporate' defaults to optimal cost split.")
    ]

    for r_title, r_desc in rules_list:
        p_r = doc.add_paragraph(style='List Bullet')
        r_t = p_r.add_run(f"{r_title}: ")
        r_t.bold = True
        p_r.add_run(r_desc)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # --- SECTION 5: APP OWNER BRAINSTORMING & DECISION AGENDA ---
    h5 = doc.add_heading("5. Key Discussion Questions for the App Owner", level=1)
    h5.runs[0].font.name = "Georgia"
    h5.runs[0].font.color.rgb = navy
    h5.runs[0].font.size = Pt(15)

    questions = [
        ("1. Automated vs. Dispatcher-Approved Farm-Out", "Should the system automatically dispatch farmed-out legs to network affiliates upon booking, or should it queue them as 'Recommended for Farm-Out' in the Dispatch Matrix for 1-click owner approval?"),
        ("2. Customer Transparency", "When Leg 2 is farmed out to Manhattan Prestige, should the customer portal display 'Fulfilled by Certified Network Partner: Manhattan Prestige', or remain 100% white-labeled under 'ANB Limo Executive Network'?"),
        ("3. Client Preference Toggle at Checkout", "On multi-leg bookings with long layovers (e.g. 5 hours), should we present the customer with two options: 'Option A: Dedicated Chauffeur (Same Driver & Luggage In Car - $1,150)' vs. 'Option B: Smart Inter-City Split (Best Value - $820)'?"),
        ("4. Settlement & Payout Timing", "Should affiliate payouts be triggered immediately upon driver trip completion via Stripe Connect Custom Accounts, or on a weekly aggregated clearinghouse statement?")
    ]

    for q_title, q_desc in questions:
        p_q = doc.add_paragraph(style='List Bullet')
        r_q = p_q.add_run(f"{q_title}\n")
        r_q.bold = True
        r_q.font.color.rgb = navy
        p_q.add_run(f"• Discussion Context: {q_desc}")
        p_q.paragraph_format.space_after = Pt(6)

    # Output paths
    output_dir = "docs"
    os.makedirs(output_dir, exist_ok=True)
    doc_path = os.path.join(output_dir, "Multi_Leg_Journey_And_Farm_Out_Business_Rules_Blueprint.docx")
    doc.save(doc_path)
    print(f"Document successfully created at: {doc_path}")

if __name__ == "__main__":
    build_document()
