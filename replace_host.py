import os
import re

directory = 'src'
pattern1 = r'"http://localhost:8000(.*?)"'
replacement1 = r'`http://${window.location.hostname}:8000\1`'

pattern2 = r'`http://localhost:8000(.*?)`'
replacement2 = r'`http://${window.location.hostname}:8000\1`'

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = re.sub(pattern1, replacement1, content)
            new_content = re.sub(pattern2, replacement2, new_content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
