import os
import re
import json

repo_root = r"c:\DEV_DASINGH\GitHub_SkilledClass\limo-starter-python"

findings = []

patterns = [
    (r"\bmock\b", "MOCK_KEYWORD"),
    (r"\bsimulat(?:e|ed|ion|ing)\b", "SIMULATION_KEYWORD"),
    (r"\bfake\b", "FAKE_KEYWORD"),
    (r"\bdummy\b", "DUMMY_KEYWORD"),
    (r"\bplaceholder\b", "PLACEHOLDER_KEYWORD"),
    (r"\bstub\b", "STUB_KEYWORD"),
    (r"\b0\.08875\b", "HARDCODED_TAX_RATE"),
    (r"setActionNotice\([^)]*(?:simulat|dummy|fake|sample)", "SIMULATED_UI_ACTION"),
]

for root, dirs, files in os.walk(repo_root):
    if any(p in root for p in [".git", "node_modules", ".pytest_cache", "dist", "build"]):
        continue
    for f in files:
        if not f.endswith((".py", ".ts", ".tsx", ".json", ".yaml", ".yml", ".md")):
            continue
        filepath = os.path.join(root, f)
        rel_path = os.path.relpath(filepath, repo_root)
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as fh:
                for line_no, line in enumerate(fh, 1):
                    for pat, pat_name in patterns:
                        if re.search(pat, line, re.IGNORECASE):
                            findings.append({
                                "file": rel_path,
                                "line": line_no,
                                "type": pat_name,
                                "content": line.strip()[:140]
                            })
        except Exception as e:
            pass

print(f"Total findings: {len(findings)}")

# Group by category and by file
by_file = {}
for f in findings:
    fp = f["file"]
    if fp not in by_file:
        by_file[fp] = []
    by_file[fp].append(f)

# Save full results to scratch json
with open(os.path.join(os.path.dirname(__file__), "audit_findings.json"), "w", encoding="utf-8") as out:
    json.dump({"total": len(findings), "by_file": by_file}, out, indent=2)

print("\n--- SUMMARY BY TOP FILES ---")
sorted_files = sorted(by_file.items(), key=lambda x: len(x[1]), reverse=True)
for fp, items in sorted_files[:30]:
    print(f"{fp:<60} : {len(items)} hits")
