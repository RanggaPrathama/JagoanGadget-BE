import { of, throwError } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';
import { Counter, Histogram } from 'prom-client';

function createMockMetric() {
  const metric = {
    inc: jest.fn(),
    observe: jest.fn(),
    labels: jest.fn(),
  };
  return metric as unknown as Counter<string> & Histogram<string>;
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
    const requestsTotal = createMockMetric();
    const requestDuration = createMockMetric();
    const errorsTotal = createMockMetric();

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
    const requestsTotal = createMockMetric();
    const requestDuration = createMockMetric();
    const errorsTotal = createMockMetric();

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

  it('records error status 500 via tap.next when exception filter converts error to response', () => {
    const requestsTotal = createMockMetric();
    const requestDuration = createMockMetric();
    const errorsTotal = createMockMetric();

    const interceptor = new MetricsInterceptor(
      requestsTotal as unknown as Counter<string>,
      requestDuration as unknown as Histogram<string>,
      errorsTotal as unknown as Counter<string>,
    );

    const ctx = makeCtx('POST', '/users', 500);
    const next = { handle: () => of(null) };

    interceptor.intercept(ctx, next as never).subscribe(() => {
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
    });
  });
});
