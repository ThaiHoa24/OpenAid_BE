import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createValidationPipe } from './common/pipes/index.js';
import { AllExceptionsFilter } from './common/filters/index.js';
import {
  LoggingInterceptor,
  TransformInterceptor,
} from './common/interceptors/index.js';

/** Shared HTTP setup for main.ts and smoke tests. */
export function configureApplication(app: INestApplication, swagger = true) {
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();

  if (swagger) {
    const config = new DocumentBuilder()
      .setTitle('OpenAid API')
      .setDescription(
        'Project scaffold. Domain endpoints marked 501 are contracts pending implementation.',
      )
      .setVersion('0.1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT-auth',
      )
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, config),
    );
  }
}
