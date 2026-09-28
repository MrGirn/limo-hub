import json

def format_gap_markdown():
    with open('scratch/comprehensive_gap_report.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    total_apis = data['total_apis']
    total_ui_connected = data['total_ui_connected']
    total_gaps = data['total_gaps']
    groups = data['groups']

    lines = []
    lines.append("# Comprehensive Deep-Level API-to-UI Coverage & GAP Audit Report")
    lines.append(f"\n**Total Backend APIs Evaluated**: `{total_apis}`  ")
    lines.append(f"**Connected to UI**: `{total_ui_connected}` ({total_ui_connected/total_apis*100:.1f}%)  ")
    lines.append(f"**UI GAPs (Missing / Unwired UI)**: `{total_gaps}` ({total_gaps/total_apis*100:.1f}%)  \n")

    lines.append("## 1. Executive Domain Summary\n")
    lines.append("| Operational Subsystem | Total APIs | Connected UIs | UI GAPs | Coverage % |")
    lines.append("| :--- | :---: | :---: | :---: | :---: |")

    for g_name, g_data in sorted(groups.items()):
        tot = g_data['total']
        conn = g_data['completed']
        gap = g_data['gaps']
        pct = (conn / tot) * 100
        lines.append(f"| **{g_name}** | `{tot}` | `{conn}` | `{gap}` | **{pct:.1f}%** |")

    lines.append("\n---\n")
    lines.append("## 2. Granular Subsystem Breakdown & Identified GAPs\n")

    for g_name, g_data in sorted(groups.items()):
        lines.append(f"### Subsystem: {g_name}")
        lines.append(f"**Total Endpoints**: `{g_data['total']}` | **Connected**: `{g_data['completed']}` | **Missing UI / GAPs**: `{g_data['gaps']}`\n")
        
        # Table of items
        lines.append("| HTTP Method | Endpoint Route | Backend Function | Integration State | Connected UI Component(s) | Required UI Action / GAP Detail |")
        lines.append("| :--- | :--- | :--- | :---: | :--- | :--- |")

        for item in g_data['items']:
            methods = ", ".join(item['methods'])
            path = item['path']
            func = item['func_name']
            is_conn = item['is_complete']
            callers = item['ui_callers']
            
            if is_conn:
                state_badge = "✅ **CONNECTED**"
                comp_list = "<br>".join([f"`{c['file']}` ({c['how']})" for c in callers])
                gap_detail = "Fully rendered and interactive in UI"
            else:
                state_badge = "❌ **GAP (NO UI)**"
                comp_list = "*None*"
                gap_detail = f"Missing frontend trigger, modal, or form in UI for `{func}`"

            lines.append(f"| `{methods}` | `{path}` | `{func}` | {state_badge} | {comp_list} | {gap_detail} |")

        lines.append("\n")

    md_content = "\n".join(lines)
    with open('scratch/GAP_AUDIT_REPORT.md', 'w', encoding='utf-8') as f:
        f.write(md_content)

    print("Generated scratch/GAP_AUDIT_REPORT.md successfully!")

if __name__ == '__main__':
    format_gap_markdown()
