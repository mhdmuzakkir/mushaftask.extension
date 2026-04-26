import re
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()
ids = re.findall(r'id="([^"]+)"', content)
unique_ids = sorted(set(ids))
print('ALL_UNIQUE_IDS')
for uid in unique_ids:
    print(uid)
print('TOTAL_UNIQUE', len(unique_ids))
print('TOTAL_WITH_DUPLICATES', len(ids))
from collections import Counter
counts = Counter(ids)
duplicates = [(k, v) for k, v in counts.items() if v > 1]
if duplicates:
    print('DUPLICATES_FOUND')
    for k, v in sorted(duplicates):
        print(k, v)
else:
    print('NO_DUPLICATES')
