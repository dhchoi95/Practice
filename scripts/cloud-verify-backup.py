#!/usr/bin/env python3
"""Back up the development DB and prove restoration in a separate temporary DB."""
from datetime import datetime, timezone
from pathlib import Path
import secrets
import subprocess
import hashlib
import json

root = Path('/workspace/.local/practice/backups')
root.mkdir(parents=True, exist_ok=True)
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup = root / f'practice-{stamp}.dump'
restore_db = 'practice_restore_' + secrets.token_hex(6)

def sql(db, query):
    return subprocess.run([
        'docker', 'exec', 'practice-postgres', 'psql', '-U', 'practice', '-d', db,
        '-At', '-v', 'ON_ERROR_STOP=1', '-c', query,
    ], check=True, capture_output=True, text=True).stdout.strip()

def counts(db):
    names = sql(db, "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;")
    if not names:
        raise RuntimeError('No application tables; backup check is premature.')
    result = {}
    for name in names.splitlines():
        quoted = '"' + name.replace('"', '""') + '"'
        count = int(sql(db, f'SELECT count(*) FROM public.{quoted};'))
        # Hash all sorted row values privately, including inventory amounts and
        # reservation times. Only aggregate counts are printed, never row data.
        rows = sql(db, f'SELECT row_to_json(t)::text FROM public.{quoted} t ORDER BY row_to_json(t)::text;')
        result[name] = (count, hashlib.sha256(rows.encode()).hexdigest())
    return result

before = counts('practice')
with backup.open('wb') as stream:
    subprocess.run([
        'docker', 'exec', 'practice-postgres', 'pg_dump', '-U', 'practice', '-d', 'practice',
        '--format=custom', '--no-owner', '--no-acl',
    ], check=True, stdout=stream)
backup.chmod(0o600)
subprocess.run(['docker', 'exec', 'practice-postgres', 'createdb', '-U', 'practice', restore_db], check=True)
try:
    with backup.open('rb') as stream:
        subprocess.run([
            'docker', 'exec', '-i', 'practice-postgres', 'pg_restore', '-U', 'practice',
            '-d', restore_db, '--no-owner', '--no-acl', '--exit-on-error',
        ], check=True, stdin=stream)
    restored = counts(restore_db)
    if before != restored:
        raise RuntimeError('Restored table counts differ; preserve backup and investigate.')
    manifest = {'file': backup.name, 'sha256': hashlib.sha256(backup.read_bytes()).hexdigest(), 'tables': restored}
    verified = backup.with_suffix('.verified.json')
    verified.write_text(json.dumps(manifest, sort_keys=True))
    verified.chmod(0o600)
    print(f'Backup restored successfully: {len(restored)} tables, {sum(value[0] for value in restored.values())} rows; every table row digest matched.')
    print(f'Retained backup: {backup}')
finally:
    subprocess.run(['docker', 'exec', 'practice-postgres', 'dropdb', '-U', 'practice', restore_db], check=True)
