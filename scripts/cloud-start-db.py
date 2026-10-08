#!/usr/bin/env python3
"""Start PostgreSQL; restore a verified retained backup only into an empty DB."""
from pathlib import Path
import hashlib
import json
import os
import secrets
import subprocess
import sys
import time

ROOT = Path('/workspace/.local/practice')
ENV = ROOT / 'runtime.env'
CONTAINER = 'practice-postgres'
IMAGE = 'postgres@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3'
ROOT.mkdir(parents=True, exist_ok=True)
if not ENV.exists():
    password = secrets.token_urlsafe(32)
    ENV.write_text(f'POSTGRES_USER=practice\nPOSTGRES_DB=practice\nPOSTGRES_PASSWORD={password}\nDATABASE_URL=postgresql://practice:{password}@127.0.0.1:5432/practice\nAUTH_SECRET={secrets.token_urlsafe(48)}\n')
    ENV.chmod(0o600)
values = dict(line.split('=', 1) for line in ENV.read_text().splitlines() if '=' in line)

def sql(db, query):
    return subprocess.run(['docker','exec',CONTAINER,'psql','-U','practice','-d',db,'-At','-v','ON_ERROR_STOP=1','-c',query],check=True,capture_output=True,text=True).stdout.strip()

def digest_file(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()

def restore_empty(db):
    if int(sql(db, "SELECT count(*) FROM pg_tables WHERE schemaname='public';")):
        return False
    markers = sorted((ROOT / 'backups').glob('*.verified.json'))
    if not markers:
        return False
    manifest = json.loads(markers[-1].read_text())
    filename = manifest['file']
    if Path(filename).name != filename:
        raise RuntimeError('Invalid backup path')
    backup = ROOT / 'backups' / filename
    if digest_file(backup) != manifest['sha256']:
        raise RuntimeError('Retained backup checksum mismatch; do not restore')
    with backup.open('rb') as stream:
        subprocess.run(['docker','exec','-i',CONTAINER,'pg_restore','-U','practice','-d',db,'--no-owner','--no-acl','--exit-on-error'],check=True,stdin=stream)
    names = sql(db, "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;").splitlines()
    if set(names) != set(manifest['tables']):
        raise RuntimeError('Restored table list differs from verified backup')
    for name in names:
        quoted = '"' + name.replace('"','""') + '"'
        count = int(sql(db, f'SELECT count(*) FROM public.{quoted};'))
        rows = sql(db, f'SELECT row_to_json(t)::text FROM public.{quoted} t ORDER BY row_to_json(t)::text;')
        if [count, hashlib.sha256(rows.encode()).hexdigest()] != manifest['tables'][name]:
            raise RuntimeError('Restored data differs from verified backup')
    print(f'Verified retained backup restored into empty database {db}: {len(names)} tables.')
    return True

existing = subprocess.run(['docker','container','inspect',CONTAINER],capture_output=True)
if existing.returncode:
    docker_env = {**os.environ, **{key:values[key] for key in ['POSTGRES_USER','POSTGRES_PASSWORD','POSTGRES_DB']}}
    subprocess.run(['docker','run','-d','--name',CONTAINER,'--env','POSTGRES_USER','--env','POSTGRES_PASSWORD','--env','POSTGRES_DB','-p','127.0.0.1:5432:5432','-v',f'{ROOT}/postgres:/var/lib/postgresql/data',IMAGE],env=docker_env,check=True,stdout=subprocess.DEVNULL)
else:
    subprocess.run(['docker','start',CONTAINER],check=True,stdout=subprocess.DEVNULL)
for attempt in range(30):
    if subprocess.run(['docker','exec',CONTAINER,'pg_isready','-U','practice','-d','practice'],capture_output=True).returncode == 0:
        break
    time.sleep(1)
else:
    raise SystemExit('Database readiness timed out')
sql('practice','SELECT 1;')
if '--verify-restoration' in sys.argv:
    target = 'practice_startup_check_' + secrets.token_hex(6)
    subprocess.run(['docker','exec',CONTAINER,'createdb','-U','practice',target],check=True)
    try:
        if not restore_empty(target):
            raise RuntimeError('No verified backup available to exercise restoration')
    finally:
        subprocess.run(['docker','exec',CONTAINER,'dropdb','-U','practice',target],check=True)
else:
    restored = restore_empty('practice')
    print('PostgreSQL ready; SQL check passed. '+('Backup restored.' if restored else 'Existing data preserved.'))
