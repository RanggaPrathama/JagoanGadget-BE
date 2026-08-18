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
