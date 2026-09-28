with open('frontend/src/components/CustomerPortal.tsx', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if 'wizardStep ===' in line or 'wizardStep =' in line or 'wizard-step' in line:
            print(f"{i}: {line.strip()[:100]}")
