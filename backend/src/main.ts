import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // §1.2 — security headers
  app.use(helmet());

  // §1.8 — limit request body to 100 kb
  app.use(json({ limit: '100kb' }));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // §1.3 — FRONTEND_URL required in production (comma-separated for multiple origins)
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl && process.env.NODE_ENV === 'production') {
    throw new Error('FRONTEND_URL env var is required in production.');
  }
  const allowedOrigins = frontendUrl
    ? frontendUrl.split(',').map(u => u.trim()).filter(Boolean)
    : ['http://localhost:4200', 'http://localhost:4201'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Sport Card API running on http://localhost:${port}/api`);
}

bootstrap();
