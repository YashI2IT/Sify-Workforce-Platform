import 'temporal-polyfill/full/global';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import net from 'net';
import { AppModule } from './app.module.js';

function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => {
        try { tester.close(); } catch {}
        resolve(false);
      })
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen({ port, host, exclusive: true });
  });
}

async function waitForPort(port: number, host: string, maxAttempts = 20, delayMs = 500, logger?: Logger): Promise<void> {
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
  const host = process.env.HOST ?? '0.0.0.0';

  await waitForPort(port, host, 20, 500, logger);

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
  ];
  if (process.env.FRONTEND_URL) {
    const feUrl = process.env.FRONTEND_URL.trim().replace(/\/$/, '');
    if (!allowedOrigins.includes(feUrl)) allowedOrigins.push(feUrl);
  }

  // Enable CORS
  app.enableCors({
    origin: allowedOrigins,
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

  // Redirect root to API docs
  app.getHttpAdapter().getInstance().get('/', (_req: any, res: any) => {
    res.redirect('/api/docs');
  });

  // Support /api/inngest fallback to route to /api/v1/inngest for Inngest dev server auto-probing
  app.getHttpAdapter().getInstance().use(['/api/inngest', '/inngest'], (req: any, res: any, next: any) => {
    req.url = req.originalUrl.replace(/^\/(api\/inngest|inngest)/, '/api/v1/inngest');
    app.getHttpAdapter().getInstance().handle(req, res, next);
  });

  await app.listen(port, host);
  logger.log(`Server listening on http://${host}:${port}`);
}

await bootstrap();