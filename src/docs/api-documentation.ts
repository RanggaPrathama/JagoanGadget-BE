import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

export function setupApiDocumentation(app: INestApplication) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription(
      'REST API for the NestJS backend starter.\n\n' +
        '> **Better Auth** — Lihat dokumentasi lengkap endpoint auth (sign-up, sign-in, sign-out, session) ' +
        'di [`/api/auth/reference`](/api/auth/reference) (disediakan langsung oleh Better Auth).',
    )
    .setVersion('1.0')
    .addServer('/', 'Local development')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Masukkan access token pada header Authorization dengan format Bearer <token>.',
      },
      'bearerAuth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  app.use('/api/docs', apiReference({ content: document }));
}
