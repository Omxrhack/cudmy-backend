// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  // Clean Architecture: el dominio y la aplicación no conocen NestJS, la BD ni HTTP.
  {
    files: ['apps/auth/src/domain/**/*.ts', 'apps/auth/src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs/*', '@nestjs/**'],
              message: 'domain/application no deben depender de NestJS.',
            },
            {
              group: ['knex', 'pg', 'argon2', '@prisma/*'],
              message: 'domain/application no deben depender de infraestructura (BD/crypto).',
            },
            {
              group: ['class-validator', 'class-transformer'],
              message: 'La validación vive en el borde (gateway), no en el dominio/aplicación.',
            },
            {
              group: ['rxjs', 'rxjs/*'],
              message: 'domain/application deben mantenerse agnósticos del framework.',
            },
          ],
        },
      ],
    },
  },
);
