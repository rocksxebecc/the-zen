import os

def fix_mojibake(text):
    replacements = {
        'â•': '═',
        'â€”': '—',
        'â€“': '–',
        'â†’': '→',
        'â†“': '↓',
        'âˆž': '∞',
        'âœ ': '✎',
        'â”€': '─'
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text

for root, _, files in os.walk('.'):
    for file in files:
        if file.endswith('.html') or file.endswith('.js') or file.endswith('.css'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            fixed = fix_mojibake(content)
            if fixed != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(fixed)
                print(f'Fixed {filepath}')
