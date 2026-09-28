import json

with open('scratch/comprehensive_gap_report.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

blueprint = {}

for g_name, g_data in sorted(data['groups'].items()):
    unconnected = [it for it in g_data['items'] if not it['is_complete']]
    blueprint[g_name] = []
    print(f"\n=======================================================")
    print(f"### {g_name} ({len(unconnected)} Remaining GAPs)")
    print(f"=======================================================")
    for it in unconnected:
        methods = ",".join(it['methods'])
        print(f"• [{methods:6s}] {it['path']:<60s} -> {it['func_name']}")
        blueprint[g_name].append({
            'method': methods,
            'path': it['path'],
            'func_name': it['func_name'],
            'doc': it['doc']
        })

with open('scratch/itemized_gaps_blueprint.json', 'w', encoding='utf-8') as out:
    json.dump(blueprint, out, indent=2)
