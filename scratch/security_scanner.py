import os
import re
import json

secret_patterns = [
    (r'(?i)(?:password|passwd|pwd)\s*[:=]\s*["\']([^"\']{4,})["\']', 'Password literal'),
    (r'(?i)(?:secret|api_key|apikey|jwt_secret|private_key)\s*[:=]\s*["\']([^"\']{8,})["\']', 'Secret/API key literal'),
    (r'sk_live_[0-9a-zA-Z]{24,}', 'Live Stripe Secret Key'),
    (r'sk_test_[0-9a-zA-Z]{24,}', 'Test Stripe Secret Key'),
    (r'AC[0-9a-fA-F]{32}', 'Twilio Account SID'),
    (r'AKIA[0-9A-Z]{16}', 'AWS Access Key ID'),
    (r'(?i)AIza[0-9A-Za-z-_]{35}', 'Google API Key'),
]

findings = []
exclude_dirs = {'.git', 'node_modules', 'dist', '__pycache__', '.venv', 'venv', 'brain', '.agents'}

for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    for f in files:
        if f.endswith(('.py', '.ts', '.tsx', '.json', '.yml', '.yaml', '.env', '.env.example')):
            p = os.path.join(root, f).replace('\\', '/')
            if 'security_scanner.py' in p:
                continue
            with open(p, 'r', encoding='utf-8', errors='ignore') as fh:
                content = fh.read()
                for regex, label in secret_patterns:
                    for m in re.finditer(regex, content):
                        val = m.group(0)
                        redacted = val[:12] + '...[REDACTED]' if len(val) > 12 else '...[REDACTED]'
                        findings.append({
                            'file': p,
                            'type': label,
                            'match': redacted
                        })

print(f"Total Secret Matches: {len(findings)}")
with open('scratch/secret_scan_results.json', 'w', encoding='utf-8') as f:
    json.dump(findings, f, indent=2)

for f in findings[:25]:
    print(f"{f['file']} -> [{f['type']}] {f['match']}")
