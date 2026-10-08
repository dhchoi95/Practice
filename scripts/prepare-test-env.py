#!/usr/bin/env python3
"""Prepare an isolated cloud test database without resetting either database."""
from pathlib import Path
import os
import secrets
import subprocess
from urllib.parse import urlsplit, urlunsplit

root = Path('/workspace/.local/practice')
source = dict(line.split('=', 1) for line in (root / 'runtime.env').read_text().splitlines() if '=' in line)
url = urlsplit(source['DATABASE_URL'])
test_url = urlunsplit((url.scheme, url.netloc, '/practice_test', url.query, url.fragment))
path = root / 'test.env'
if not path.exists():
    path.write_text(f'DATABASE_URL={test_url}\nAUTH_SECRET={secrets.token_urlsafe(48)}\n')
    path.chmod(0o600)
values = dict(line.split('=', 1) for line in path.read_text().splitlines() if '=' in line)
if urlsplit(values['DATABASE_URL']).path != '/practice_test':
    raise SystemExit('Test configuration must target the separate practice_test database.')
exists = subprocess.run(['docker','exec','practice-postgres','psql','-U','practice','-d','postgres','-At','-c',"SELECT 1 FROM pg_database WHERE datname='practice_test'"],check=True,capture_output=True,text=True).stdout.strip()
if not exists:
    subprocess.run(['docker','exec','practice-postgres','createdb','-U','practice','practice_test'],check=True)
subprocess.run(['npm','run','db:migrate:deploy'],env={**os.environ,**values},check=True)
print('Dedicated test database prepared; existing rows preserved.')
