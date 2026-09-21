"""
CLI Script to Declaratively Spin Up a New Sovereign Vendor Application Cell.
Usage:
    python scripts/spin_up_vendor.py config/vendor_definitions/vendor_anb_philly.yaml
"""
import sys
import json
from app.services.vendor_spinup_service import vendor_spinup_service

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/spin_up_vendor.py <path_to_vendor_yaml>")
        sys.exit(1)

    yaml_path = sys.argv[1]
    print(f"[*] Provisioning Sovereign Vendor Cell from: {yaml_path}")
    result = vendor_spinup_service.spin_up_from_yaml_file(yaml_path)
    if result:
        print(f"[+] SUCCESS: Spun up {result.vendor_id} ({result.vendor_name})")
        print(json.dumps(result.model_dump(), indent=2))
    else:
        print(f"[-] FAILED to spin up vendor from {yaml_path}")
        sys.exit(1)

if __name__ == "__main__":
    main()
