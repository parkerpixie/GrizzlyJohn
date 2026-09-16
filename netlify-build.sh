#!/bin/sh
set -eu

python3 - <<'PY'
from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')
tags = [
    '  <script src="dbt-button-fix.js?v=20260916-3"></script>',
    '  <script src="campfire-daily-reflections.js?v=20260916-1"></script>'
]

for tag in tags:
    if tag not in text:
        text = text.replace('</body>', f'{tag}\n</body>')

path.write_text(text, encoding='utf-8')
PY
