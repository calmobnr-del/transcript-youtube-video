/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    // Allow all origins for simplicity, or restrict to your frontend URL in production
    origin: '*',
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;

  // Middleware to remove trailing slashes from requests
  app.use((req: any, res: any, next: () => void) => {
    if (req.path.length > 1 && req.path.endsWith('/')) {
      const query = req.url.slice(req.path.length);
      const newPath = req.path.slice(0, -1);
      res.redirect(301, newPath + query);
    } else {
      next();
    }
  });
  
  // Debug logging
  app.use((req, res, next) => {
    Logger.log(`Request: ${req.method} ${req.url}`);
    next();
  });

  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
