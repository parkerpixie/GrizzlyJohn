#!/bin/sh
set -eu

python3 - <<'PY'
from pathlib import Path
import re

path = Path('index.html')
text = path.read_text(encoding='utf-8')
text = re.sub(r'\s*<script src="dbt-button-fix\.js(?:\?v=[^"]*)?"></script>\s*', '\n', text)
tag = '  <script src="dbt-button-fix.js?v=20260917-1"></script>'
text = text.replace('</body>', f'{tag}\n</body>')
path.write_text(text, encoding='utf-8')
PY
