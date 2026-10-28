import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApplication } from './bootstrap.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApplication(app);
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`OpenAid API: http://localhost:${port}/api`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
