import re

def check_file(path, name):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f'\n=== {name} ===')
    
    # Check for patterns that indicate unclosed template literals or JSX props
    lines = content.split('\n')
    
    # Find lines with unclosed ${ inside template literals followed by suspicious closing }
    for i, line in enumerate(lines):
        # Count ${ in template literals
        stripped = line.strip()
        
        # Pattern: template literal with ${...  that ends with single } instead of )}
        # This catches: width: `${something...}}  (should be ...})}
        # or: width: `${something...}%`}  (should be ...}%)}}
        
        # Simple check: if a line contains `${` and ends with `}` but NOT `}}`, and has Math.min/Math.max
        if ('${' in line or '`}' in line) and ('Math.min' in line or 'Math.max' in line):
            # Check if there's a mismatched )} or }%}
            if re.search(r'\}[\`\"]?\s*$', line) and not re.search(r'\}\}\s*$', line):
                if '`}' in line or line.rstrip().endswith('}'):
                    print(f'  Line {i+1}: possible template literal issue')
                    print(f'    {repr(line[-80:])}')
        
        # Check for unclosed inline object in JSX (line ends with lone } when it should have }} or },)
        if stripped.endswith('}') and not stripped.endswith('}}') and not stripped.endswith('},') and not stripped.endswith('{}') and not stripped.endswith('[]'):
            # Check if this looks like an inline JSX object prop that wasn't closed
            if '={{' in stripped or '={{{' in stripped:
                print(f'  Line {i+1}: unclosed JSX inline object')
                print(f'    {repr(stripped)}')
    
    # Also try a basic brace balance on each line
    for i, line in enumerate(lines):
        opens = line.count('{') + line.count('[') + line.count('(')
        closes = line.count('}') + line.count(']') + line.count(')')
        # If a line has significantly more closes than opens, flag it
        if closes > opens + 2:
            print(f'  Line {i+1}: more closing than opening (opens={opens}, closes={closes})')
            print(f'    {repr(line.strip()[-60:])}')
    
    print(f'  Check complete for {name}')

# Check key files
for fname in ['Flashcards.tsx', 'CardBattle.tsx']:
    path = f'e:/docx/bmo-robot---phân-loại-rác/src/components/{fname}'
    check_file(path, fname)

print('\n=== Done ===')
