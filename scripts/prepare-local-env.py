#!/usr/bin/env python3
"""Preserve local configuration; generate development-only bootstrap credentials."""
from pathlib import Path
import os
import secrets

runtime = Path('/workspace/.local/practice/runtime.env')
values = dict(line.split('=',1) for line in runtime.read_text().splitlines() if '=' in line)
defaults = {'DEMO_EMAIL':'owner@burger.local','DEMO_PASSWORD':secrets.token_urlsafe(18),'DEMO_STAFF_EMAIL':'staff@burger.local','DEMO_STAFF_PASSWORD':secrets.token_urlsafe(18),'APP_URL':'http://127.0.0.1:3000'}
for key, value in defaults.items():
    values.setdefault(key,value)
runtime.write_text(''.join(f'{key}={value}\n' for key,value in values.items()))
runtime.chmod(0o600)
local = Path('.env')
existing = dict(line.split('=',1) for line in local.read_text().splitlines() if '=' in line and not line.startswith('#')) if local.exists() else {}
required = ['DATABASE_URL','AUTH_SECRET','DEMO_EMAIL','DEMO_PASSWORD','DEMO_STAFF_EMAIL','DEMO_STAFF_PASSWORD','APP_URL']
additions = []
for key in required:
    if key not in existing:
        additions.append(f'{key}={os.environ.get(key,values[key])}\n')
if additions:
    with local.open('a') as stream:
        if local.exists() and local.stat().st_size and not local.read_text().endswith('\n'):
            stream.write('\n')
        stream.writelines(additions)
local.chmod(0o600)
print('Protected local environment configured; existing values preserved.')
