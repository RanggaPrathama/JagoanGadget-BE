#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const name = args[0];

if (!name) {
  console.error('Usage: pnpm init-project <project-name>');
  console.error(
    '  <project-name> must be lowercase kebab-case (e.g. my-project)',
  );
  process.exit(1);
}

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
  console.error(`Invalid project name: "${name}"`);
  console.error(
    '  Use lowercase kebab-case: letters, digits, and hyphens between words.',
  );
  process.exit(1);
}

const title = name
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const snake = name.replace(/-/g, '_');

const files = [
  'package.json',
  'package-lock.json',
  '.env.example',
  'views/index.hbs',
  'views/main.hbs',
  'src/config/configuration.ts',
  'src/config/env.validation.ts',
];

// Verify all files exist before making changes (atomic fail).
const missing = files.filter((f) => !existsSync(resolve(f)));
if (missing.length > 0) {
  console.error('Missing target files, aborting:');
  missing.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}

const replacements = [
  // package.json
  [/\"name\": \"my-starter-project\"/, `"name": "${name}"`],
  [/\"name\": \"nest-typescript-starter\"/, `"name": "${name}"`],
  [
    /\"description\": \"[^\"]*backend starter\"/,
    `"description": "${name} API — NestJS + PostgreSQL + Better Auth + RBAC backend"`,
  ],
  // package-lock.json
  [/"name": "nest-typescript-starter"/g, `"name": "${name}"`],
  [/"name": "my-starter-project"/g, `"name": "${name}"`],
  // .env.example
  [/^APP_NAME=.*$/m, `APP_NAME=${title} API`],
  [/^DATABASE_NAME=.*$/m, `DATABASE_NAME=${snake}`],
  [
    /^SEED_SUPERADMIN_EMAIL=.*$/m,
    `SEED_SUPERADMIN_EMAIL=superadmin@${snake}.local`,
  ],
  [/^REDIS_KEY_PREFIX=.*$/m, `REDIS_KEY_PREFIX=${snake}:rbac`],
  // config defaults
  [/APP_NAME \?\? 'NestJS API'/, `APP_NAME ?? '${title} API'`],
  [/DATABASE_NAME \?\? 'app_db'/, `DATABASE_NAME ?? '${snake}'`],
  [/REDIS_KEY_PREFIX \?\? 'app:rbac'/, `REDIS_KEY_PREFIX ?? '${snake}:rbac'`],
  [
    /Joi\.string\(\)\.trim\(\)\.default\('NestJS API'\)/,
    `Joi.string().trim().default('${title} API')`,
  ],
  [
    /Joi\.string\(\)\.trim\(\)\.default\('app:rbac'\)/,
    `Joi.string().trim().default('${snake}:rbac')`,
  ],
  // views
  [
    /Backend engine for <strong class=\"text-white\">your project<\/strong>/,
    `Backend engine for <strong class=\"text-white\">${title}<\/strong>`,
  ],
  [/Backend API for NestJS starter/, `Backend API for ${title}`],
];

let changed = false;
for (const file of files) {
  const before = readFileSync(resolve(file), 'utf8');
  let after = before;
  for (const [pattern, replacement] of replacements) {
    after = after.replace(pattern, replacement);
  }
  if (after !== before) {
    writeFileSync(resolve(file), after);
    changed = true;
    console.log(`  updated ${file}`);
  } else {
    console.log(`  unchanged ${file}`);
  }
}

if (!changed) {
  console.log('No placeholders found — nothing to update.');
  process.exit(0);
}

console.log(`\nProject renamed to "${name}". Next steps:`);
console.log('  cp .env.example .env');
console.log('  pnpm install');
console.log('  docker compose up -d');
console.log('  pnpm run migration:run');
console.log('  pnpm run seed');
console.log('  pnpm run start:dev');
