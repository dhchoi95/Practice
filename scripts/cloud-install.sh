#!/usr/bin/env bash
set -eu
cd /workspace/Practice
python scripts/cloud-start-db.py
python scripts/prepare-local-env.py
npm ci
npm run db:generate
npm run db:validate
npm run db:migrate:deploy
npm run db:migrate:status
npm run db:seed
npm run build
python scripts/cloud-verify-backup.py
