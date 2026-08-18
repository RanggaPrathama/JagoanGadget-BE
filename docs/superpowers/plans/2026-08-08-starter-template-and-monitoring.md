# Starter Template + Metrics/Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `JagoanGadget-be` into a reusable NestJS backend starter template (GitHub-template-ready) with an `init-project` rename script, neutral branding, infra docker-compose (postgres/redis/prometheus/grafana), and a new additive `metrics` module exposing Prometheus metrics.

**Architecture:** Additive metrics module (`src/modules/metrics/`) using the already-installed `@willsoto/nestjs-prometheus` library, registered conditionally in `app.module.ts` behind an env toggle. Branding is neutralized across config/docs/views with placeholder defaults. A standalone Node script `scripts/init-project.mjs` renames project identity placeholders. Docker-compose runs infra only (postgres, redis, prometheus, grafana); the backend runs on the host via pnpm.

**Tech Stack:** NestJS v11, TypeScript, pnpm 11, TypeORM, Better Auth, `@willsoto/nestjs-prometheus@6.1.0`, `prom-client@15.1.3`, Docker Compose, Prometheus, Grafana.

## Global Constraints

- **DO NOT change logic in existing modules:** `src/modules/*` (access-control, users, storage, uploads, redis), `src/common/*`, `src/lib/auth.ts`, `src/database/seed.service.ts`, `src/database/database.module.ts`, `src/database/typeorm.config.ts` must not have behavior changes. Branding passes touch **default string values only**.
- **`src/config/cofiguration.ts` → `src/config/configuration.ts`** rename is the ONE allowed filename change on existing files. Update imports in `app.module.ts` and `main.ts`.
- **Redis stays mandatory** — no in-memory fallback, no driver changes.
- **Metrics module is the ONLY new module.** `src/modules/metrics/` is additive; everything else under `src/modules/` is untouched.
- **`app.module.ts` edit allowed** — conditional import of `MetricsModule` + add `/metrics` to pino `autoLogging.ignore`. This is the only runtime-file change besides the config rename.
- **Metrics endpoint is `/metrics`** (root, bypasses `/api` prefix — the library mounts its controller path via metadata).
- **Docker-compose = infra only** (postgres, redis, prometheus, grafana). Backend runs on host. **No Dockerfile.**
- **Grafana default creds** `admin`/`admin` (do NOT set env creds in compose).
- **README is English.** AGENTS.md/CLAUDE.md stay Indonesian (internal dev docs).
- **Credit:** README + footer keep "Rangga Prathama" + `ranggaprathama9@gmail.com`.
- Package manager: **pnpm** (not npm). Commands in this plan use `pnpm`.
- `package.json` name default: `my-starter-project` (script renames per-project).
- `.env.example` `APP_NAME` default: `NestJS API`.

---

### Task 1: Baseline commit of dirty working tree

The working tree has extensive uncommitted work (the entire `src/modules/*` implementation, `.env.example`, `AGENTS.md`, `CLAUDE.md`, `public/`, `views/`, `docs/`, `docker-compose.yaml` empty, deleted `src/app.service.ts`, etc.). A GitHub template is only usable if the clone is complete, so this must be committed first as a clean baseline before template changes.

**Files:**
- Commit: entire working tree (all modified/untracked files except ignored `.env` and `storage/`)

- [ ] **Step 1: Review what would be committed**

Run: `git status --short`
Expected: the modified files (`.gitignore`, `README.md`, `eslint.config.mjs`, `package.json`, `package-lock.json`, `src/app.controller.ts`, `src/app.module.ts`, `src/main.ts`, `tsconfig.json`) plus untracked dirs (`src/common/`, `src/config/`, `src/database/`, `src/docs/`, `src/lib/`, `src/modules/`, `public/`, `views/`, `storage/`, `better-auth_migrations/`, `docs/`, `AGENTS.md`, `CLAUDE.md`, `.env.example`, `docker-compose.yaml`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`).

Verify `.env` is NOT listed (it is gitignored).

- [ ] **Step 2: Stage and commit baseline**

```bash
git add -A
git commit -m "chore: baseline JagoanGadget-be implementation for starter template

Co-Authored-By: Claude <noreply@anthropic.com>"
```

Expected: clean working tree after commit. Run `git status --short` → empty.

- [ ] **Step 3: Verify build still works before refactoring**

Run: `pnpm install && pnpm run build`
Expected: build succeeds. If `pnpm run build` fails due to pnpm 11 build-script config, note it — Task 4 fixes `pnpm-workspace.yaml` and it's expected to pass after that. (If the failure is unrelated to build scripts — e.g. a TS error — STOP and report; do not proceed.)

---

### Task 2: Neutralize branding defaults in config files

Replace Gadgetin-specific default strings with neutral placeholders. These are **default values only** — no logic changes. Skip files the spec marks as untouched (seed.service.ts, database.module.ts, typeorm.config.ts are already clean).

**Files:**
- Modify: `src/config/cofiguration.ts:70,85,108`
- Modify: `src/config/env.validation.ts:8,33`
- Modify: `src/database/data-source.ts:15`
- Modify: `src/docs/api-documentation.ts:7-12`

**Interfaces:**
- Consumes: none (config defaults only)
- Produces: neutral defaults that later tasks (Task 3 script) will target by exact string

- [ ] **Step 1: Neutralize `src/config/cofiguration.ts` defaults**

In `src/config/cofiguration.ts`, change:
- Line 70: `name: process.env.APP_NAME ?? 'Gadgetin API',` → `name: process.env.APP_NAME ?? 'NestJS API',`
- Line 85: `name: process.env.DATABASE_NAME ?? 'gadgetin',` → `name: process.env.DATABASE_NAME ?? 'app_db',`
- Line 108: `keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'gadgetin:rbac',` → `keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'app:rbac',`

- [ ] **Step 2: Neutralize `src/config/env.validation.ts` defaults**

In `src/config/env.validation.ts`, change:
- Line 8: `.default('Gadgetin API')` → `.default('NestJS API')`
- Line 33: `.default('gadgetin:rbac')` → `.default('app:rbac')`

- [ ] **Step 3: Neutralize `src/database/data-source.ts` DB name default**

In `src/database/data-source.ts`, line 15:
`database: process.env.DATABASE_NAME ?? 'gadgetin',` → `database: process.env.DATABASE_NAME ?? 'app_db',`

(This file is the TypeORM CLI DataSource only — used by `migration:*` scripts, never imported at runtime. Verified: no `import ... data-source` anywhere in `src/`.)

- [ ] **Step 4: Neutralize Swagger docs title/description**

In `src/docs/api-documentation.ts`:
- `.setTitle('Gadgetin API')` → `.setTitle('NestJS API')`
- `'REST API for Gadgetin e-commerce platform.\n\n'` → `'REST API for the NestJS backend starter.\n\n'`

Note: `setupApiDocumentation` currently does not receive the config service. Keep it simple — static neutral strings for now. (Making it dynamic from `app.name` is out of scope; the strings are neutral placeholders the init script could also target, but the plan keeps the script to `.env.example`/views/package.json.)

- [ ] **Step 5: Verify no remaining default Gadgetin refs (except views, which Task 3 covers)**

Run: `grep -rin "gadgetin" src/config src/docs src/database | grep -vi "seed\|module\|typeorm.config"`
Expected: no output. (`seed.service.ts`, `database.module.ts`, `typeorm.config.ts` are confirmed clean and must remain untouched.)

- [ ] **Step 6: Commit**

```bash
git add src/config/cofiguration.ts src/config/env.validation.ts src/database/data-source.ts src/docs/api-documentation.ts
git commit -m "chore: neutralize branding defaults in config and docs

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Neutralize branding in `.env.example` and views

Neutralize remaining Gadgetin branding in template files that the init-project script will later target.

**Files:**
- Modify: `.env.example`
- Modify: `views/index.hbs:13`
- Modify: `views/main.hbs:6`
- (Keep: `views/main.hbs:51,69` — Rangga credit, GitHub link, footer built-by)

**Interfaces:**
- Consumes: nothing
- Produces: exact placeholder strings the init script (Task 8) replaces

- [ ] **Step 1: Neutralize `.env.example`**

In `.env.example`, change:
- `APP_NAME=Gadgetin API` → `APP_NAME=NestJS API`
- `DATABASE_NAME=gadgetin` → `DATABASE_NAME=app_db`
- `SEED_SUPERADMIN_EMAIL=superadmin@jagoangadget.local` → `SEED_SUPERADMIN_EMAIL=superadmin@localhost`
- `REDIS_KEY_PREFIX=gadgetin:rbac` → `REDIS_KEY_PREFIX=app:rbac`

- [ ] **Step 2: Neutralize `views/index.hbs` hero description**

In `views/index.hbs`, line 13:
`Backend engine for <strong class="text-white">Gadgetin</strong> — a modern e‑commerce platform.`
→
`Backend engine for <strong class="text-white">your project</strong> — secure, performant, and built for scale.`

- [ ] **Step 3: Neutralize `views/main.hbs` meta description**

In `views/main.hbs`, line 6:
`<meta name="description" content="{{appName}} — Backend API for Gadgetin e-commerce platform">`
→
`<meta name="description" content="{{appName}} — Backend API for NestJS starter">`

- [ ] **Step 4: Verify**

Run: `grep -rin "gadgetin\|jagoangadget" .env.example views`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add .env.example views/index.hbs views/main.hbs
git commit -m "chore: neutralize branding in env example and views

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Fix pnpm build-script config + rename typo'd config file

Two hygiene fixes: (a) pnpm 11 no longer reads `pnpm.onlyBuiltDependencies` in `package.json` — move it into `pnpm-workspace.yaml`; (b) rename `cofiguration.ts` → `configuration.ts` and update imports.

**Files:**
- Modify: `package.json` (remove `pnpm` block)
- Modify: `pnpm-workspace.yaml` (add `onlyBuiltDependencies`)
- Rename: `src/config/cofiguration.ts` → `src/config/configuration.ts`
- Modify: `src/app.module.ts` (import path)
- Modify: `src/main.ts` (import path)

**Interfaces:**
- Consumes: Task 1 baseline
- Produces: correct `import configuration from './config/configuration'` — the config file name used by all later tasks and the init script target `src/config/configuration.ts`

- [ ] **Step 1: Move pnpm build config to `pnpm-workspace.yaml`**

Current `pnpm-workspace.yaml`:
```yaml
allowBuilds:
  '@scarf/scarf': false
  '@swc/core': false
```

Change to:
```yaml
allowBuilds:
  '@scarf/scarf': false
  '@swc/core': false

onlyBuiltDependencies:
  - '@nestjs/core'
  - '@swc/core'
```

(Note: `allowBuilds` and `onlyBuiltDependencies` coexist in pnpm 11. `onlyBuiltDependencies` whitelists packages that may run postinstall build scripts; `allowBuilds` overrides with explicit allow/deny. Keep both.)

- [ ] **Step 2: Remove `pnpm` block from `package.json`**

Delete lines 105-110 (the `"pnpm": { "onlyBuiltDependencies": [...] }` block) from `package.json`.

Verify: `node -e "const p=require('./package.json'); console.log('pnpm field:', p.pnpm ?? 'REMOVED OK')"` → prints `REMOVED OK`.

- [ ] **Step 3: Rename config file and update imports**

```bash
git mv src/config/cofiguration.ts src/config/configuration.ts
```

In `src/app.module.ts` line 10: `import configuration from './config/cofiguration';` → `import configuration from './config/configuration';`
In `src/main.ts` line 7: `import configuration from './config/cofiguration';` → `import configuration from './config/configuration';`

- [ ] **Step 4: Verify no stale references + build passes**

Run: `grep -rn "cofiguration" src` → no output.
Run: `pnpm install && pnpm run build` → build succeeds (this is where the pnpm-workspace fix matters if `@swc/core`/`@nestjs/core` postinstall scripts were blocked).

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml src/config/cofiguration.ts src/config/configuration.ts src/app.module.ts src/main.ts
git commit -m "chore: fix pnpm build config and rename typo'd config file

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Rewrite stale `app.controller.spec.ts`

The current spec references the deleted `AppService`. Rewrite it to test `AppController.getHome()` using `ConfigService` mock, so `pnpm test` is green.

**Files:**
- Modify: `src/app.controller.spec.ts`

**Interfaces:**
- Consumes: `AppController.getHome()` (reads `ConfigService.get('app.name')` and `ConfigService.get('app.environment')`)
- Produces: a passing controller test

- [ ] **Step 1: Write the failing test**

Replace the entire `src/app.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                'app.name': 'NestJS API',
                'app.environment': 'test',
              };
              return values[key] ?? null;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get(AppController);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHome', () => {
    it('should return page title and app name', () => {
      const result = controller.getHome();
      expect(result).toEqual({
        pageTitle: 'Home',
        appName: 'NestJS API',
        year: expect.any(Number),
        nestVersion: '11',
        NODE_ENV: 'test',
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails initially**

Run: `pnpm test -- src/app.controller.spec.ts`
Expected: FAIL — the mock `ConfigService.get('app.name')` returns `'NestJS API'` but `AppController` calls `this.configService.get<string>('app.name')`; the mock's `get` returns string. If the old test file references `AppService` it errors on import — either way it fails. Confirm the failure is the stale/insufficient test, not a missing class.

- [ ] **Step 3: Verify the implementation satisfies it**

`AppController` is already implemented (returns the object with pageTitle, appName, year, nestVersion, NODE_ENV). No production-code change needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/app.controller.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run full test suite**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/app.controller.spec.ts
git commit -m "test: rewrite app controller spec for getHome

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Add metrics env vars + config typing

Add `METRICS_ENABLED` and `METRICS_PORT` env vars to `.env.example` and Joi validation schema. Add metrics config to the typed config factory. All additive/optional.

**Files:**
- Modify: `src/config/env.validation.ts`
- Modify: `src/config/configuration.ts` (was `cofiguration.ts`, renamed in Task 4)
- Modify: `.env.example`

**Interfaces:**
- Consumes: Task 2 (neutral defaults), Task 4 (renamed config file)
- Produces:
  - `AppConfig.metrics: { enabled: boolean; port: number }`
  - `configService.get('metrics.enabled')`, `configService.get('metrics.port')`
  - Joi keys `METRICS_ENABLED` (boolean, default false), `METRICS_PORT` (number port, default 3000)

- [ ] **Step 1: Add Joi validation for metrics env**

In `src/config/env.validation.ts`, after the `LOG_LEVEL` entry (before closing `}` of the Joi object), add:

```typescript
  METRICS_ENABLED: Joi.boolean().default(false),
  METRICS_PORT: Joi.number().port().default(3000),
```

- [ ] **Step 2: Add metrics to the typed config factory**

In `src/config/configuration.ts`:
- Add to the `AppConfig` type, after the `storage` block:

```typescript
  metrics: {
    enabled: boolean;
    port: number;
  };
```

- Add to the returned object, after `storage:`:

```typescript
    metrics: {
      enabled: toBoolean(process.env.METRICS_ENABLED),
      port: toNumber(process.env.METRICS_PORT, 3000),
    },
```

(Verify `toBoolean` and `toNumber` are already imported at the top of the file — they are, from `../common/helpers/cast.helper`.)

- [ ] **Step 3: Add metrics env to `.env.example`**

Append to `.env.example`:

```dotenv
# Metrics (Prometheus)
METRICS_ENABLED=true
# Port the backend listens on (Prometheus scrapes this)
METRICS_PORT=3000
```

- [ ] **Step 4: Verify build**

Run: `pnpm run build`
Expected: build succeeds (type `metrics` present in `AppConfig`).

- [ ] **Step 5: Commit**

```bash
git add src/config/env.validation.ts src/config/configuration.ts .env.example
git commit -m "feat: add metrics env config

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Create `MetricsModule` (metrics providers + interceptor)

Create the new additive metrics module. This is the ONLY new module — everything under `src/modules/` that already exists stays untouched.

**Files:**
- Create: `src/modules/metrics/metrics.providers.ts`
- Create: `src/modules/metrics/metrics.interceptor.ts`
- Create: `src/modules/metrics/metrics.module.ts`

**Interfaces:**
- Consumes:
  - `PrometheusModule` from `@willsoto/nestjs-prometheus` (library API verified: `makeCounterProvider`, `makeHistogramProvider`, `InjectMetric`)
  - `@AllowAnonymous()` from `@thallesp/nestjs-better-auth` (used in `app.controller.ts`)
  - `ConfigService` for `metrics.enabled`
- Produces:
  - `MetricsModule` — imports `PrometheusModule`, exports it (global: false means downstream modules need it; `MetricsModule` must export `PrometheusModule` so `PrometheusController` (endpoint `/metrics`) is registered in the app)
  - `MetricsInterceptor` — an `APP_INTERCEPTOR` (NestInterceptor) that records request metrics
  - Metric tokens (via `InjectMetric`): `http_requests_total`, `http_request_duration_seconds`, `http_errors_total`

- [ ] **Step 1: Write the metrics providers**

Create `src/modules/metrics/metrics.providers.ts`:

```typescript
import { makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

export const HTTP_REQUESTS_TOTAL = 'http_requests_total';
export const HTTP_REQUEST_DURATION_SECONDS = 'http_request_duration_seconds';
export const HTTP_ERRORS_TOTAL = 'http_errors_total';

export const metricsProviders = [
  makeCounterProvider({
    name: HTTP_REQUESTS_TOTAL,
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
  }),
  makeHistogramProvider({
    name: HTTP_REQUEST_DURATION_SECONDS,
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2.5, 5, 10],
  }),
  makeCounterProvider({
    name: HTTP_ERRORS_TOTAL,
    help: 'Total number of HTTP errors (status >= 400)',
    labelNames: ['method', 'route', 'status'],
  }),
];
```

- [ ] **Step 2: Write the metrics interceptor**

Create `src/modules/metrics/metrics.interceptor.ts`:

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import {
  HTTP_REQUESTS_TOTAL,
  HTTP_REQUEST_DURATION_SECONDS,
  HTTP_ERRORS_TOTAL,
} from './metrics.providers';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric(HTTP_REQUESTS_TOTAL)
    private readonly requestsTotal: Counter<string>,
    @InjectMetric(HTTP_REQUEST_DURATION_SECONDS)
    private readonly requestDuration: Histogram<string>,
    @InjectMetric(HTTP_ERRORS_TOTAL)
    private readonly errorsTotal: Counter<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method = req?.method ?? 'UNKNOWN';
    // Use the route pattern (e.g. '/users/:id') instead of full path to avoid label cardinality explosion.
    const route = req?.route?.path ?? 'unknown';
    const start = process.hrtime();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const status = res?.statusCode ?? 200;
          const durationSeconds = hrtimeToSeconds(start);

          this.requestsTotal.inc({ method, route, status });
          this.requestDuration.observe(
            { method, route, status },
            durationSeconds,
          );

          if (status >= 400) {
            this.errorsTotal.inc({ method, route, status });
          }
        },
        error: () => {
          const status = 500;
          const durationSeconds = hrtimeToSeconds(start);

          this.requestsTotal.inc({ method, route, status });
          this.requestDuration.observe(
            { method, route, status },
            durationSeconds,
          );
          this.errorsTotal.inc({ method, route, status });
        },
      }),
    );
  }
}

function hrtimeToSeconds(hrtime: [number, number]): number {
  const [seconds, nanos] = hrtime;
  return seconds + nanos / 1e9;
}
```

- [ ] **Step 3: Write the metrics module**

Create `src/modules/metrics/metrics.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsInterceptor } from './metrics.interceptor';
import { metricsProviders } from './metrics.providers';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
        config: {},
      },
    }),
  ],
  providers: [
    ...metricsProviders,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [PrometheusModule],
})
export class MetricsModule {}
```

Notes:
- `PrometheusModule.register` is **global: false** by default. `MetricsModule` **must** `exports: [PrometheusModule]` so the `PrometheusController` (which serves `/metrics`) and `PROM_CLIENT`/`PROMETHEUS_OPTIONS` tokens are available to the app. Since `MetricsModule` is imported in `AppModule` (Task 9) and re-exports it, the endpoint registers globally.
- The interceptor is registered as `APP_INTERCEPTOR` (global), so all routes get metrics without decorating each.
- Path `/metrics` bypasses the `/api` prefix (library mounts controller path via `Reflect.defineMetadata`), so the endpoint is served at root `/metrics`.
- The interceptor has **no auth dependency** — it's a global interceptor, not a route with a guard. `@AllowAnonymous()` is not needed here (it applies to controllers/routes, not global interceptors).

- [ ] **Step 4: Write the failing test**

Create `src/modules/metrics/metrics.interceptor.spec.ts`:

```typescript
import { of, throwError } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';
import { Counter, Histogram } from 'prom-client';

function createMockMetric<T>(type: 'counter' | 'histogram') {
  const metric = {
    inc: jest.fn(),
    observe: jest.fn(),
    labels: jest.fn(),
  };
  return metric as unknown as Counter<string> & Histogram<string> & { type: typeof type };
}

function makeCtx(method: string, path: string, statusCode: number) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, route: { path } }),
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as import('@nestjs/common').ExecutionContext;
}

describe('MetricsInterceptor', () => {
  it('records request count, duration, and error on success (status >= 400)', () => {
    const requestsTotal = createMockMetric('counter');
    const requestDuration = createMockMetric('histogram');
    const errorsTotal = createMockMetric('counter');

    const interceptor = new MetricsInterceptor(
      requestsTotal as unknown as Counter<string>,
      requestDuration as unknown as Histogram<string>,
      errorsTotal as unknown as Counter<string>,
    );

    const ctx = makeCtx('GET', '/users', 404);
    const next = { handle: () => of('response') };

    interceptor.intercept(ctx, next as never).subscribe(() => {
      expect(requestsTotal.inc).toHaveBeenCalledWith({
        method: 'GET',
        route: '/users',
        status: 404,
      });
      expect(requestDuration.observe).toHaveBeenCalled();
      expect(errorsTotal.inc).toHaveBeenCalledWith({
        method: 'GET',
        route: '/users',
        status: 404,
      });
    });
  });

  it('records error status 500 when handler throws', () => {
    const requestsTotal = createMockMetric('counter');
    const requestDuration = createMockMetric('histogram');
    const errorsTotal = createMockMetric('counter');

    const interceptor = new MetricsInterceptor(
      requestsTotal as unknown as Counter<string>,
      requestDuration as unknown as Histogram<string>,
      errorsTotal as unknown as Counter<string>,
    );

    const ctx = makeCtx('POST', '/users', 500);
    const next = { handle: () => throwError(() => new Error('boom')) };

    interceptor.intercept(ctx, next as never).subscribe({
      error: () => {
        expect(requestsTotal.inc).toHaveBeenCalledWith({
          method: 'POST',
          route: '/users',
          status: 500,
        });
        expect(errorsTotal.inc).toHaveBeenCalledWith({
          method: 'POST',
          route: '/users',
          status: 500,
        });
      },
    });
  });
});
```

- [ ] **Step 5: Run tests to verify pass**

Run: `pnpm test -- src/modules/metrics/metrics.interceptor.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/modules/metrics/
git commit -m "feat: add metrics module with request metrics interceptor

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Conditionally register `MetricsModule` in `app.module.ts` + ignore `/metrics` in pino logging

Wire the metrics module into the root app module behind the `METRICS_ENABLED` toggle, and stop pino from logging every Prometheus scrape.

**Files:**
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `MetricsModule` (Task 7), `ConfigService` (already injected in `LoggerModule.forRootAsync` useFactory)
- Produces: app boot that registers `/metrics` when `METRICS_ENABLED=true` and skips metrics scraping noise in logs

- [ ] **Step 1: Add import**

In `src/app.module.ts`, add to the existing imports:

```typescript
import { MetricsModule } from './modules/metrics/metrics.module';
```

- [ ] **Step 2: Conditionally include `MetricsModule` in `imports`**

The `imports` array currently ends with `UploadsModule,`. Add a spread that conditionally includes the module. Change:

```typescript
    StorageModule,
    UploadsModule,
  ],
```

to:

```typescript
    StorageModule,
    UploadsModule,
    ...(process.env.METRICS_ENABLED === 'true' ? [MetricsModule] : []),
  ],
```

(Using `process.env.METRICS_ENABLED` directly here mirrors how the module decision is made at bootstrap; the config factory already parses it via `toBoolean`. Alternative: use a `ConfigModule`-provided flag, but at the imports-array level `process.env` is the standard NestJS pattern for conditional module registration.)

- [ ] **Step 3: Add `/metrics` to pino `autoLogging.ignore`**

In the `LoggerModule.forRootAsync` useFactory, find the `autoLogging` block:

```typescript
            autoLogging: {
              ignore: (req) =>
                req.url === '/api/health' || req.url === '/api/healthz',
            },
```

Change to add `/metrics`:

```typescript
            autoLogging: {
              ignore: (req) =>
                req.url === '/api/health' ||
                req.url === '/api/healthz' ||
                req.url === '/metrics',
            },
```

- [ ] **Step 4: Verify build + metrics endpoint works when enabled**

Run: `pnpm run build` → succeeds.

Run: `METRICS_ENABLED=true pnpm run start` (in a separate terminal; requires Postgres + Redis up — see Task 10 for infra). Then:

```bash
curl -s http://localhost:3000/metrics | head -20
```

Expected: returns prometheus metrics (lines like `# HELP process_cpu_seconds_total ...` and `http_requests_total`). Confirm `GET /metrics` is at root, not `/api/metrics`.

- [ ] **Step 5: Verify metrics endpoint absent when disabled**

With `METRICS_ENABLED=false` (default), boot and confirm `curl -s http://localhost:3000/metrics` returns 404 (or the SPA catch-all). If the app fails to boot without metrics (e.g. the `APP_INTERCEPTOR` is missing), STOP and report.

- [ ] **Step 6: Commit**

```bash
git add src/app.module.ts
git commit -m "feat: conditionally register metrics module and ignore /metrics in logs

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Docker Compose (postgres, redis, prometheus, grafana)

Fill in the empty `docker-compose.yaml` with 4 infra services. Backend runs on host (no `app` service, no Dockerfile).

**Files:**
- Create: `docker-compose.yaml` (currently 0 bytes)
- Create: `prometheus/prometheus.yml`
- Create: `grafana/provisioning/datasources/prometheus.yml`
- Create: `grafana/provisioning/dashboards/dashboard.yml`
- Create: `grafana/dashboards/nestjs-overview.json`

**Interfaces:**
- Consumes: `/metrics` endpoint on host port `METRICS_PORT` (default 3000)
- Produces: `docker compose up -d` brings up postgres:16, redis:7, prometheus (scraping `host.docker.internal:3000/metrics`), grafana (auto-provisioned datasource + dashboard)

- [ ] **Step 1: Write `docker-compose.yaml`**

```yaml
services:
  postgres:
    image: postgres:16
    container_name: app-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app_db
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d app_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    container_name: app-redis
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  prometheus:
    image: prom/prometheus:latest
    container_name: app-prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    # Linux note: add `extra_hosts: ["host.docker.internal:host-gateway"]` to scrape host services.
    extra_hosts:
      - "host.docker.internal:host-gateway"

  grafana:
    image: grafana/grafana:latest
    container_name: app-grafana
    restart: unless-stopped
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
    ports:
      - "3001:3000"
    environment:
      GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH: /var/lib/grafana/dashboards/nestjs-overview.json
    # Default Grafana creds: admin/admin. Change in production (env GF_SECURITY_ADMIN_PASSWORD or via UI).

volumes:
  postgres-data:
  redis-data:
  prometheus-data:
  grafana-data:
```

- [ ] **Step 2: Write `prometheus/prometheus.yml`**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'nestjs-backend'
    metrics_path: /metrics
    static_configs:
      - targets: ['host.docker.internal:3000']
```

(Note: `host.docker.internal:3000` is the backend running on the host. On Linux, the `extra_hosts` line in compose enables it. If the backend port differs via `METRICS_PORT`, update the target.)

- [ ] **Step 3: Write Grafana datasource provisioning**

Create `grafana/provisioning/datasources/prometheus.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

- [ ] **Step 4: Write Grafana dashboard provisioning**

Create `grafana/provisioning/dashboards/dashboard.yml`:

```yaml
apiVersion: 1

providers:
  - name: 'NestJS'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /var/lib/grafana/dashboards
```

- [ ] **Step 5: Write the Grafana dashboard JSON**

Create `grafana/dashboards/nestjs-overview.json`. Include a panel for each of these metrics: request rate (`http_requests_total`), error rate (`http_errors_total`), latency p50/p95/p99 (`http_request_duration_seconds`), and Node.js heap usage (`process_resident_memory_bytes`, `nodejs_heap_size_used_bytes`).

```json
{
  "annotations": { "list": [] },
  "editable": true,
  "graphTooltip": 0,
  "panels": [
    {
      "title": "Request Rate (req/s)",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [
        {
          "expr": "sum(rate(http_requests_total[1m])) by (status)",
          "legendFormat": "{{status}}",
          "refId": "A"
        }
      ]
    },
    {
      "title": "Error Rate (5xx/s)",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [
        {
          "expr": "sum(rate(http_errors_total{status=~\"5..\"}[1m])) by (route)",
          "legendFormat": "{{route}}",
          "refId": "A"
        }
      ]
    },
    {
      "title": "Latency p50/p95/p99 (s)",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [
        {
          "expr": "histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
          "legendFormat": "p50",
          "refId": "A"
        },
        {
          "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
          "legendFormat": "p95",
          "refId": "B"
        },
        {
          "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
          "legendFormat": "p99",
          "refId": "C"
        }
      ]
    },
    {
      "title": "Node.js Heap Used",
      "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 },
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [
        {
          "expr": "nodejs_heap_size_used_bytes",
          "legendFormat": "heap used",
          "refId": "A"
        }
      ]
    }
  ],
  "schemaVersion": 39,
  "tags": ["nestjs"],
  "templating": { "list": [] },
  "time": { "from": "now-15m", "to": "now" },
  "title": "NestJS Overview",
  "uid": "nestjs-overview"
}
```

- [ ] **Step 6: Validate compose + bring up infra**

Run: `docker compose config`
Expected: valid config, 4 services listed.

Run: `docker compose up -d`
Expected: postgres, redis, prometheus, grafana all start (healthchecks green).

- [ ] **Step 7: Verify Prometheus scrapes host backend**

With the backend running on host with `METRICS_ENABLED=true`, run:

```bash
docker compose exec prometheus wget -qO- http://host.docker.internal:3000/metrics 2>/dev/null | head -5
```

Or check in Prometheus UI `http://localhost:9090/targets` — the `nestjs-backend` target shows UP.

- [ ] **Step 8: Verify Grafana**

Open `http://localhost:3001`, log in `admin`/`admin`. Confirm the Prometheus datasource is auto-provisioned and the "NestJS Overview" dashboard appears with panels showing data.

- [ ] **Step 9: Commit**

```bash
git add docker-compose.yaml prometheus/ grafana/
git commit -m "feat: add docker-compose infra with prometheus and grafana monitoring

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: README rewrite (English)

Rewrite the default NestJS README into a concise English template doc.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: neutral branding from Tasks 2-3, metrics info from Task 9
- Produces: the template's primary documentation — uses `<project-name>` placeholders, NEVER hardcodes `my-starter-project`

- [ ] **Step 1: Write README**

Replace `README.md` with:

```markdown
# NestJS Backend Starter

A production-ready **NestJS** backend starter with authentication, role-based access control (RBAC), file storage, and monitoring — ready to be reused for any project.

> Built by [Rangga Prathama](https://github.com/RanggaPrathama) · `ranggaprathama9@gmail.com`

## Features

- **Authentication** — [Better Auth](https://better-auth.com) (email/password) with session status endpoints under `/api/auth`.
- **RBAC** — menus, permissions, roles, and per-route permission guards (`@RequirePermission`), with Redis-backed permission cache.
- **Users** — user CRUD, role assignment, and `/api/me/*` profile endpoints.
- **Storage & Uploads** — local storage driver with presigned upload URLs.
- **API Docs** — Swagger UI + Scalar at `/api/docs` (start the server to view).
- **Monitoring** — Prometheus metrics at `/metrics` and a pre-provisioned Grafana dashboard.
- **Logging** — structured logging with `pino` / `pino-pretty`.
- **Validation** — global `ValidationPipe` (whitelist, transform, forbid non-whitelisted).

## Tech Stack

NestJS 11 · TypeScript · PostgreSQL · TypeORM · Better Auth · Redis · pnpm · Prometheus · Grafana

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- Docker (for PostgreSQL, Redis, Prometheus, Grafana)

## Quickstart

```bash
# 1. Clone the template (use "Use this template" on GitHub)
git clone <your-template-url> my-project
cd my-project

# 2. Rename the project
pnpm init-project my-project

# 3. Configure environment
cp .env.example .env
# Edit .env — set BETTER_AUTH_SECRET (>= 32 chars), DATABASE_*, etc.

# 4. Start infra (PostgreSQL, Redis, Prometheus, Grafana)
docker compose up -d

# 5. Install dependencies
pnpm install

# 6. Run migrations + seed
pnpm run migration:run
pnpm run seed

# 7. Use the app
# API:      http://localhost:3000/api
# Docs:     http://localhost:3000/api/docs
# Metrics:  http://localhost:3000/metrics
# Grafana:  http://localhost:3001  (admin/admin — change in production!)
```

## Project Structure

```
src/
  common/       # decorators, guards, entities, helpers, filters
  config/       # typed config + Joi env validation
  database/     # TypeORM module, DataSource, migrations, seed
  lib/          # Better Auth instance
  docs/         # Swagger/Scalar setup
  modules/
    access-control/   # menus, permissions, roles (RBAC)
    users/            # users, roles, /api/me
    storage/          # local storage driver
    uploads/          # presigned uploads
    redis/            # Redis module (permission cache)
    metrics/          # Prometheus metrics
```

## Scripts

| Task | Command |
|------|---------|
| Rename project | `pnpm init-project <name>` |
| Install deps | `pnpm install` |
| Dev server | `pnpm run start:dev` |
| Build | `pnpm run build` |
| Test | `pnpm test` |
| Lint | `pnpm run lint` |
| Generate migration | `pnpm run migration:generate -- -n Name` |
| Run migrations | `pnpm run migration:run` |

## Environment Variables

See `.env.example` for all variables. Key ones:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | `development` \| `test` \| `production` | `development` |
| `PORT` | HTTP port | `3000` |
| `APP_NAME` | Display name | `NestJS API` |
| `APP_BASE_URL` | Public base URL | `http://localhost:3000` |
| `APP_CORS_ORIGIN` | Comma-separated CORS origins | `*` |
| `DATABASE_*` | PostgreSQL connection | — |
| `BETTER_AUTH_SECRET` | Auth secret (>= 32 chars) | — |
| `REDIS_*` | Redis connection + cache prefix | — |
| `METRICS_ENABLED` | Enable `/metrics` endpoint | `false` |
| `METRICS_PORT` | Port Prometheus scrapes | `3000` |

## Monitoring

- **Metrics endpoint:** `/metrics` (root, outside `/api`), served by the `metrics` module when `METRICS_ENABLED=true`.
- **Prometheus:** `http://localhost:9090` — scrapes `host.docker.internal:3000/metrics` (backend on host).
- **Grafana:** `http://localhost:3001` — pre-provisioned "NestJS Overview" dashboard (request rate, error rate, latency p50/p95/p99, Node.js heap). Default creds `admin`/`admin` — **change in production** (via `GF_SECURITY_ADMIN_PASSWORD` env or Grafana UI).

## License

MIT
```

- [ ] **Step 2: Verify README has no template-name leak**

Run: `grep -i "my-starter-project\|gadgetin" README.md`
Expected: no output (README uses `<project-name>`/generic wording only).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README as English starter template doc

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Update AGENTS.md and CLAUDE.md

Update internal dev docs: remove fixed known issues, neutralize Gadgetin references, add metrics module.

**Files:**
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: the `metrics` module (Task 7), renamed config (Task 4)
- Produces: dev docs consistent with the template

- [ ] **Step 1: Update `CLAUDE.md`**

- In "Known Issues", remove: `Filename typo: src/config/cofiguration.ts → should be configuration.ts`.
- Change the remaining "README still default NestJS starter" line → "README rewritten as template doc".
- In "Project Structure", add `metrics/` under `src/modules/`.
- In "Environment Variables", add `METRICS_ENABLED`, `METRICS_PORT`.

- [ ] **Step 2: Update `AGENTS.md`**

- In "Known Issues", remove: `Filename typo: src/config/cofiguration.ts → seharusnya configuration.ts`.
- Change "README.md masih default NestJS starter" → "README sudah ditulis ulang untuk template".
- In "Current Module Status" under "Sudah ada:", add `metrics — Prometheus metrics, /metrics endpoint`.
- Under "Belum ada:", remove nothing (e-commerce modules still not built).

- [ ] **Step 3: Verify no stale typo refs**

Run: `grep -rn "cofiguration" AGENTS.md CLAUDE.md`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md CLAUDE.md
git commit -m "docs: update AGENTS and CLAUDE for template + metrics

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: `init-project` rename script

Create the script that renames project identity placeholders after cloning the template.

**Files:**
- Create: `scripts/init-project.mjs`
- Modify: `package.json` (add `init-project` script)

**Interfaces:**
- Consumes: placeholder strings produced in Tasks 2-3, renamed config file from Task 4
- Produces: `pnpm init-project <name>` command that renames: `package.json` name/description, `.env.example` APP_NAME/DATABASE_NAME/SEED_SUPERADMIN_EMAIL/REDIS_KEY_PREFIX, views, and config default `NestJS API`

- [ ] **Step 1: Write the script**

Create `scripts/init-project.mjs`:

```javascript
#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const name = args[0];

if (!name) {
  console.error('Usage: pnpm init-project <project-name>');
  console.error('  <project-name> must be lowercase kebab-case (e.g. my-project)');
  process.exit(1);
}

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
  console.error(`Invalid project name: "${name}"`);
  console.error('  Use lowercase kebab-case: letters, digits, and hyphens between words.');
  process.exit(1);
}

const title = name
  .split('-')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const snake = name.replace(/-/g, '_');

const files = [
  'package.json',
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
  [/\"description\": \"[^\"]*backend starter\"/, `"description": "${name} API — NestJS + PostgreSQL + Better Auth + RBAC backend"`],
  // .env.example
  [/^APP_NAME=.*$/m, `APP_NAME=${title} API`],
  [/^DATABASE_NAME=.*$/m, `DATABASE_NAME=${snake}`],
  [/^SEED_SUPERADMIN_EMAIL=.*$/m, `SEED_SUPERADMIN_EMAIL=superadmin@${snake}.local`],
  [/^REDIS_KEY_PREFIX=.*$/m, `REDIS_KEY_PREFIX=${snake}:rbac`],
  // config defaults
  [/APP_NAME \?\? 'NestJS API'/, `APP_NAME ?? '${title} API'`],
  [/DATABASE_NAME \?\? 'app_db'/, `DATABASE_NAME ?? '${snake}'`],
  [/REDIS_KEY_PREFIX \?\? 'app:rbac'/, `REDIS_KEY_PREFIX ?? '${snake}:rbac'`],
  [/Joi\.string\(\)\.trim\(\)\.default\('NestJS API'\)/, `Joi.string().trim().default('${title} API')`],
  [/Joi\.string\(\)\.trim\(\)\.default\('app:rbac'\)/, `Joi.string().trim().default('${snake}:rbac')`],
  // views
  [/Backend engine for <strong class=\"text-white\">your project<\/strong>/, `Backend engine for <strong class=\"text-white\">${title}<\/strong>`],
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
```

- [ ] **Step 2: Add the npm script to `package.json`**

In `package.json`, in the `scripts` block, add:

```json
    "init-project": "node scripts/init-project.mjs"
```

- [ ] **Step 3: Make the script executable-friendly**

Run: `git update-index --chmod=+x scripts/init-project.mjs` (optional on Windows, but good for POSIX users).

- [ ] **Step 4: Test the script on a throwaway copy**

The script must be tested WITHOUT modifying the working repo. Copy the repo to a temp dir and test there:

```bash
# From repo root (adjust path as needed for your shell)
tmpdir=$(mktemp -d)
git archive HEAD | tar -x -C "$tmpdir"
cd "$tmpdir"
pnpm init-project demo-app
```

Expected output: `package.json`, `.env.example`, `views/index.hbs`, `views/main.hbs`, `src/config/configuration.ts`, `src/config/env.validation.ts` all "updated".

Verify in temp dir:
```bash
grep -n '"name"' package.json           # "demo-app"
grep '^APP_NAME=' .env.example          # APP_NAME=Demo App API
grep '^DATABASE_NAME=' .env.example     # DATABASE_NAME=demo_app
grep '^SEED_SUPERADMIN_EMAIL=' .env.example  # superadmin@demo_app.local
grep '^REDIS_KEY_PREFIX=' .env.example  # demo_app:rbac
grep 'Backend engine for' views/index.hbs   # Demo App
grep "APP_NAME ?? " src/config/configuration.ts  # 'Demo App API'
```

- [ ] **Step 5: Test idempotency (run twice)**

In the temp dir, run `pnpm init-project demo-app` again. Expected: "No placeholders found — nothing to update" (second run is a no-op).

- [ ] **Step 6: Test validation (invalid input)**

In the temp dir:
```bash
pnpm init-project "Bad Name!"
```
Expected: exit code 1, error message about kebab-case.

Also test no-arg: `pnpm init-project` → exit 1 + usage message.

- [ ] **Step 7: Commit**

```bash
git add scripts/init-project.mjs package.json
git commit -m "feat: add init-project rename script

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: Final template smoke test

Full verification that the committed template is usable end-to-end.

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: all prior tasks
- Produces: confidence the template works; clean final state

- [ ] **Step 1: Fresh clone smoke test**

Create a fresh clone of the current repo state (as a GitHub template consumer would):

```bash
cd /tmp  # or temp dir
git clone <repo-path> template-smoke
cd template-smoke
pnpm install
pnpm run build
```

Expected: build succeeds. If pnpm build fails due to postinstall (task 4) or TS error, fix and re-run.

- [ ] **Step 2: Run init-project + verify no template leaks**

```bash
pnpm init-project smoke-app
grep -rin "gadgetin\|my-starter-project\|nest-typescript-starter" . --exclude-dir=node_modules --exclude-dir=.git
```

Expected: no output (template placeholders all renamed). Note: `docs/superpowers/*` may contain these strings — exclude or confirm they're intentional.

- [ ] **Step 3: Boot with metrics + infra**

```bash
docker compose up -d
cp .env.example .env
# edit .env: DATABASE_NAME=smoke_app, BETTER_AUTH_SECRET=<long random>
pnpm run migration:run
SEED_DB=true pnpm run start
```

Then verify:
- `curl http://localhost:3000/api/auth/status` → JSON OK
- `curl http://localhost:3000/metrics` → prometheus metrics present
- Prometheus target UP at `http://localhost:9090/targets`
- Grafana dashboard renders at `http://localhost:3001`

- [ ] **Step 4: Verify tests pass**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 5: Confirm clean working tree**

Run: `git status --short` in the real repo (not the smoke clone)
Expected: clean (all template work committed).

---

## Self-Review

**Spec coverage:**
- Branding neutralization (config/env/views/docs/data-source) → Tasks 2, 3, 10, 11
- Typo fix `cofiguration.ts` → `configuration.ts` → Task 4
- `init-project` script → Task 12
- README English + credit Rangga → Task 10
- AGENTS.md/CLAUDE.md update → Task 11
- docker-compose (postgres/redis/prometheus/grafana, no app service) → Task 9
- Metrics module (additive, `metrics` name) → Task 7
- Conditional registration + pino ignore → Task 8
- Metrics env vars (METRICS_ENABLED/METRICS_PORT) → Task 6
- pnpm-workspace sync → Task 4
- Stale test rewrite → Task 5
- Grafana default admin/admin (no env creds) → Task 9
- Baseline commit → Task 1

**Placeholder scan:** All steps contain concrete file paths, exact strings, and code. No "TBD"/"implement later". The `init-project` script uses `mktemp -d` — note on Windows this is a Git Bash utility, available in the Bash tool. In PowerShell the equivalent is `$env:TEMP` + `New-Item`. The plan's Step 4 in Task 12 shows a POSIX version; the executing engineer should adapt to their shell (the repo's primary shell is PowerShell, but Git Bash is available).

**Type consistency:**
- `MetricsModule` exported from Task 7 → imported in Task 8 as `MetricsModule`. Consistent.
- `metricsProviders` array → spread in `providers` Task 7 → referenced by `InjectMetric` in interceptor. Consistent names: `http_requests_total`, `http_request_duration_seconds`, `http_errors_total`.
- `AppConfig.metrics.{enabled,port}` from Task 6 → `process.env.METRICS_ENABLED` used in Task 8. The config factory also parses it; the conditional import uses `process.env` directly (standard NestJS pattern for conditional module registration at imports level). Consistent with the metric name keys.
- `configuration.ts` (renamed Task 4) → targeted by init script Task 12 replacement `APP_NAME ?? 'NestJS API'`. Consistent.
