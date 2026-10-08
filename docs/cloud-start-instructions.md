# Cloud environment startup

Use the existing `/workspace/Practice` checkout. Do not create an extra worktree. The installed filesystem retains source, dependencies, ignored protected configuration and verified DB backups; it does not retain live processes or guarantee Docker services survive a new task.

1. `cd /workspace/Practice`
2. Run `python scripts/cloud-start-db.py` and `python scripts/prepare-local-env.py`. The database helper checks readiness and actual SQL. It restores a checksum-verified backup only into a completely empty DB and never overwrites populated data.
3. If dependencies or the generated client are missing, run `npm ci` and `npm run db:generate`. If the production build is missing or source changed, run `npm run build`. Use the pinned official WASM Prisma helper through npm scripts. Do not disable TLS/checksum checks.
4. Apply approved migrations explicitly during environment preparation (`npm run db:migrate:deploy`). Use `npm run db:migrate:status` to check history. Run `npm run db:seed` only for this development demo if bootstrap records are missing. It preserves edited demo data and existing credentials.
5. Start `npm run start -- --hostname 127.0.0.1 --port 3000` using a managed long-running execution session. Check a pre-existing listener before starting; never kill an unrelated service. Use the canonical Origin configured in protected `.env` (`APP_URL`) consistently for all requests. This local environment defaults to the loopback address on port 3000; do not provide it as a user-facing preview link.
6. When the server is ready, run `node scripts/check-running-app.mjs`. It privately uses protected demo credentials, exercises real owner and staff login, verifies all owner screens and role restrictions, checks mobile overflow, and saves screenshots to `artifacts`. It does not change business records. Do not print `.env`, cookies or passwords.
7. Unit checks: `npm test`; API/browser checks: `npm run test:e2e -- --workers=1` (dedicated `practice_test` DB on port 3100, installed Chromium). Backup: `python scripts/cloud-verify-backup.py`; safe restore proof: `python scripts/cloud-start-db.py --verify-restoration`. Test execution does not reset the development DB.

Read README.md and docs/operations.md for details. Report actual validation outcomes and any remaining gaps. A saved setup draft does not publish/apply settings and the current-instance checks do not establish fresh-task restoration.
