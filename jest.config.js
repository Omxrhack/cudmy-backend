/** Unit tests (no infra). E2E uses apps/gateway/test/jest-e2e.json. */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/apps', '<rootDir>/libs'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@app/common(|/.*)$': '<rootDir>/libs/common/src$1',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '<rootDir>/coverage',
  testEnvironment: 'node',
};
