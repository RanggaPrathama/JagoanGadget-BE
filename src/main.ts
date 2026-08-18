import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { join } from 'node:path';
import configuration from '@config/configuration';
import { resolveCorsOrigin } from '@common/helpers/cast.helper';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { setupApiDocumentation } from './docs/api-documentation';

async function bootstrap() {
  const appConfig = configuration();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    cors: {
      origin: resolveCorsOrigin(appConfig.app.corsOrigin),
      credentials: true,
    },
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  const port = appConfig.app.port;

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'metrics', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.locals.layout = 'main';

  setupApiDocumentation(app);
  await app.listen(port);
}

bootstrap();
