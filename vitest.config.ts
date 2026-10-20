import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({resolve:{alias:{'@':path.resolve('src')}},test:{include:['tests/domain/**/*.test.ts','tests/integration/**/*.test.ts'],maxWorkers:2}});
