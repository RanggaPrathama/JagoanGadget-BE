import {
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';

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
