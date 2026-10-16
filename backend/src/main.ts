import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import net from 'net';
import { AppModule } from './app.module.js';

function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port, host);
  });
}

async function waitForPort(port: number, host: string, maxAttempts = 10, delayMs = 500, logger?: Logger): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const available = await isPortAvailable(port, host);
    if (available) return;
    if (attempt < maxAttempts) {
      logger?.warn(
        `Port ${port} on ${host} is currently in use (attempt ${attempt}/${maxAttempts}). Waiting ${delayMs}ms for previous process to release it...`
      );
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  throw new Error(`Port ${port} on ${host} is already in use by another running process after ${maxAttempts} attempts.`);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const port = Number(process.env.PORT ?? 3000);
  const host = '127.0.0.1';

  await waitForPort(port, host, 10, 500, logger);

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  // Enable CORS for local development frontend
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5173'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sify Workforce Platform')
    .setDescription('Internal API for the Sify Workforce Platform')
    .setVersion('0.1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port, host);
  logger.log(`Server listening on http://${host}:${port}`);
}

await bootstrap();