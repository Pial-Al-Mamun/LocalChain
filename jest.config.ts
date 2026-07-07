/** @jest-config-loader esbuild-register */

import { defineConfig } from 'jest';

export default defineConfig({
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/.pnpm/(?!(?:@noble|@scure)@.*)/'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  preset: 'ts-jest',
  testEnvironment: 'node',
});
