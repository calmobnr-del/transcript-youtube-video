import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';


export default async function handler(req: any, res: any) {
  const app = await NestFactory.create(AppModule);

  // Allow global prefix if you use it (e.g. /api)
  app.setGlobalPrefix('api');

  await app.init();

  const instance = app.getHttpAdapter().getInstance();
  return instance(req, res);
}
