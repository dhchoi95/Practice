#!/usr/bin/env node
/* Prisma 7.10 official WASM APIs avoid the CLI's unnecessary native engine download.
 * Dependencies and WASM artifacts are verified by npm's lockfile integrity checks.
 * No TLS, checksum, or package verification is disabled here.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const requireHere = createRequire(__filename);
require('dotenv').config({ quiet: true });
const {
  getGenerators,
  loadSchemaContext,
  validate,
  formatSchema,
} = require('@prisma/internals');
const { defaultRegistry } = require('@prisma/client-generator-registry');
const { SchemaEngineWasm } = require('@prisma/migrate');
const {
  bindMigrationAwareSqlAdapterFactory,
} = require('@prisma/driver-adapter-utils');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const schemaPath = path.resolve('prisma/schema.prisma');
const migrationDir = path.resolve('prisma/migrations');
const filters = { externalTables: [], externalEnums: [] };

function migrationPool(connectionString) {
  const pool = new Pool({ connectionString });
  const query = pool.query.bind(pool);
  // PostgreSQL catalog columns use OID 18 (internal one-character strings).
  // The official pg adapter currently omits that type from its text mapping.
  // Normalize its metadata to text only in this migration driver's results;
  // SQL, returned values, and application database types remain unchanged.
  pool.query = async (...args) => {
    const result = await query(...args);
    for (const rowset of Array.isArray(result) ? result : [result]) {
      for (const field of rowset.fields || [])
        if (field.dataTypeID === 18) field.dataTypeID = 25;
    }
    return result;
  };
  return pool;
}

async function prepareWasmArtifact() {
  // The published internals loader expects this artifact in build/, while npm
  // supplies it in the matching official schema-engine-wasm package.
  const source = path.join(
    path.dirname(requireHere.resolve('@prisma/schema-engine-wasm')),
    'schema_engine_bg.wasm',
  );
  const target = path.resolve(
    path.dirname(requireHere.resolve('@prisma/internals')),
    '../build/schema_engine_bg.wasm',
  );
  const sourceBytes = await fs.readFile(source);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const targetBytes = await fs.readFile(target).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return undefined;
  });
  if (targetBytes && !sourceBytes.equals(targetBytes))
    throw new Error(
      'Prisma WASM artifact differs from its verified package source',
    );
  if (!targetBytes) await fs.copyFile(source, target);
  const copiedBytes = await fs.readFile(target);
  const digest = (value) =>
    crypto.createHash('sha256').update(value).digest('hex');
  if (digest(sourceBytes) !== digest(copiedBytes))
    throw new Error('Prisma WASM artifact copy integrity check failed');
}

async function migrationsList() {
  await fs.mkdir(migrationDir, { recursive: true });
  const lockfile = {
    path: 'migration_lock.toml',
    content: await fs
      .readFile(path.join(migrationDir, 'migration_lock.toml'), 'utf8')
      .catch(() => null),
  };
  const directories = (await fs.readdir(migrationDir, { withFileTypes: true }))
    .filter((item) => item.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));
  const migrationDirectories = await Promise.all(
    directories.map(async (item) => ({
      path: item.name,
      migrationFile: {
        path: 'migration.sql',
        content: {
          tag: 'ok',
          value: await fs.readFile(
            path.join(migrationDir, item.name, 'migration.sql'),
            'utf8',
          ),
        },
      },
    })),
  );
  return {
    baseDir: migrationDir,
    lockfile,
    shadowDbInitScript: '',
    migrationDirectories,
  };
}

async function generate() {
  const generators = await getGenerators({
    schemaPath,
    registry: defaultRegistry.toInternal(),
    skipDownload: true,
    cliCommand: 'npm run db:generate',
  });
  try {
    for (const generator of generators) await generator.generate();
  } finally {
    for (const generator of generators) generator.stop();
  }
  console.log('Prisma client generated with official WASM schema tooling.');
}

async function migrate(command) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  await prepareWasmArtifact();
  const schemaContext = await loadSchemaContext({
    schemaPath: { cliProvidedPath: schemaPath },
  });
  const pool = migrationPool(process.env.DATABASE_URL);
  const factory = new PrismaPg(pool);
  // The published adapter's shadow method retains the original connectionString
  // when it adds `database`, so pg can reconnect to the main database. Supply an
  // explicit shadow URL through the official migration-aware factory interface.
  factory.connectToShadowDb = async () => {
    const database = `prisma_migrate_shadow_db_${crypto.randomUUID()}`;
    const shadowUrl = new URL(process.env.DATABASE_URL);
    shadowUrl.pathname = `/${database}`;
    await pool.query(`CREATE DATABASE "${database}"`);
    let adapter;
    try {
      const shadowPool = migrationPool(shadowUrl.toString());
      adapter = await new PrismaPg(shadowPool, {
        disposeExternalPool: true,
      }).connect();
    } catch (error) {
      await pool.query(`DROP DATABASE "${database}"`);
      throw error;
    }
    const originalDispose = adapter.dispose.bind(adapter);
    adapter.dispose = async () => {
      await originalDispose();
      await pool.query(`DROP DATABASE "${database}"`);
    };
    return adapter;
  };
  const engine = await SchemaEngineWasm.setup({
    adapter: bindMigrationAwareSqlAdapterFactory(factory),
    schemaContext,
  });
  try {
    if (command === 'create') {
      const migrationName = process.argv[3] || 'change';
      if (!/^[a-zA-Z0-9_-]+$/.test(migrationName))
        throw new Error(
          'Use letters, digits, underscore, or hyphen for migration names',
        );
      const schema = {
        files: schemaContext.schemaFiles.map(([filePath, content]) => ({
          path: filePath,
          content,
        })),
      };
      const list = await migrationsList();
      // The 7.10 WASM createMigration command does not yet forward the shadow
      // adapter factory. Its diff command does, and produces the same SQL from
      // committed migration history to the desired datamodel.
      const chunks = [];
      const originalWrite = process.stdout.write;
      let result;
      process.stdout.write = function (chunk, encoding, callback) {
        chunks.push(String(chunk));
        if (typeof encoding === 'function') encoding();
        if (typeof callback === 'function') callback();
        return true;
      };
      try {
        result = await engine.migrateDiff({
          from: list.migrationDirectories.length
            ? { tag: 'migrations', ...list }
            : { tag: 'empty' },
          to: { tag: 'schemaDatamodel', ...schema },
          script: true,
          exitCode: true,
          filters,
        });
      } finally {
        process.stdout.write = originalWrite;
      }
      const migrationScript = chunks.join('');
      if (result.exitCode === 2) {
        const timestamp = new Date()
          .toISOString()
          .replace(/[-:TZ.]/g, '')
          .slice(0, 14);
        const generatedMigrationName = `${timestamp}_${migrationName}`;
        const output = path.join(migrationDir, generatedMigrationName);
        await fs.mkdir(output);
        await fs.writeFile(path.join(output, 'migration.sql'), migrationScript);
        await fs.writeFile(
          path.join(migrationDir, 'migration_lock.toml'),
          'provider = "postgresql"\n',
        );
        console.log(`Migration created: ${generatedMigrationName}`);
      } else console.log('No schema changes; migration not created.');
    } else if (command === 'deploy') {
      const result = await engine.applyMigrations({
        migrationsList: await migrationsList(),
        filters,
      });
      console.log(
        `Applied migrations: ${result.appliedMigrationNames.length ? result.appliedMigrationNames.join(', ') : 'none (already current)'}`,
      );
    } else if (command === 'status') {
      const result = await engine.diagnoseMigrationHistory({
        migrationsList: await migrationsList(),
        filters,
        optInToShadowDatabase: false,
      });
      console.log(JSON.stringify(result, null, 2));
    }
  } finally {
    await engine.stop();
    await pool.end();
  }
}

async function main() {
  const command = process.argv[2];
  if (command === 'generate') return generate();
  if (command === 'validate') {
    validate({
      schemas: [[schemaPath, await fs.readFile(schemaPath, 'utf8')]],
    });
    console.log('Prisma schema valid.');
    return;
  }
  if (command === 'format') {
    const result = await formatSchema({
      schemas: [[schemaPath, await fs.readFile(schemaPath, 'utf8')]],
    });
    await fs.writeFile(schemaPath, result[0][1]);
    console.log('Prisma schema formatted.');
    return;
  }
  if (['create', 'deploy', 'status'].includes(command)) return migrate(command);
  throw new Error(
    'Usage: node scripts/prisma-wasm.cjs generate|validate|format|create [name]|deploy|status',
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
