import json
import os

with open(r"c:\DEV_DASINGH\GitHub_SkilledClass\limo-starter-python\scratch\audit_findings.json", "r", encoding="utf-8") as fh:
    data = json.load(fh)

by_file = data["by_file"]

categories = {
    "BACKEND_SIMULATIONS_AND_MOCKS": [],
    "FRONTEND_HARDCODED_DEMO_OR_SIMULATED_DATA": [],
    "PACKAGES_HARDCODED_LOGIC": [],
    "EXTERNAL_INTEGRATION_SIMULATED_FALLBACKS": [],
    "GAPS_UNFINISHED_OR_DISCONNECTED_CONTROLS": []
}

for filepath, hits in by_file.items():
    if "tests" in filepath or "data\\backups" in filepath or "docs" in filepath:
        continue
    
    for h in hits:
        line_str = h["content"]
        fp = h["file"]
        l_no = h["line"]
        typ = h["type"]
        
        # Categorize
        if "packages" in fp:
            categories["PACKAGES_HARDCODED_LOGIC"].append(f"{fp}:{l_no} [{typ}] -> {line_str}")
        elif fp.startswith("app\\services\\") or fp.startswith("app\\business_api.py"):
            if "simulate" in line_str.lower() or "mock" in line_str.lower() or "fake" in line_str.lower():
                categories["BACKEND_SIMULATIONS_AND_MOCKS"].append(f"{fp}:{l_no} [{typ}] -> {line_str}")
            else:
                categories["EXTERNAL_INTEGRATION_SIMULATED_FALLBACKS"].append(f"{fp}:{l_no} [{typ}] -> {line_str}")
        elif fp.startswith("frontend\\"):
            if "setActionNotice" in line_str or "simulate" in line_str.lower() or "dummy" in line_str.lower() or "placeholder" in line_str.lower():
                categories["FRONTEND_HARDCODED_DEMO_OR_SIMULATED_DATA"].append(f"{fp}:{l_no} [{typ}] -> {line_str}")
            else:
                categories["GAPS_UNFINISHED_OR_DISCONNECTED_CONTROLS"].append(f"{fp}:{l_no} [{typ}] -> {line_str}")

print("=== CATEGORY BREAKDOWN ===")
for cat, items in categories.items():
    print(f"\n### {cat} ({len(items)} items):")
    for it in items[:15]:
        print(f"  * {it}")
    if len(items) > 15:
        print(f"  ... and {len(items) - 15} more")
