import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// The app's browser server must use the dedicated test database, never the local
// development database. This file is outside the checkout and contains secrets.
dotenv.config({ path: '/workspace/.local/practice/test.env' });
process.env.TEST_BASE_URL ??= 'http://127.0.0.1:3100';
process.env.APP_URL = process.env.TEST_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.TEST_BASE_URL,
    headless: true,
    launchOptions: {
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox'],
    },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3100',
    url: `${process.env.TEST_BASE_URL}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
