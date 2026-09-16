#!/bin/sh
set -eu

python3 - <<'PY'
from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')
tag = '  <script src="dbt-button-fix.js?v=20260916-3"></script>'

if tag not in text:
    text = text.replace('</body>', f'{tag}\n</body>')
    path.write_text(text, encoding='utf-8')
PY
