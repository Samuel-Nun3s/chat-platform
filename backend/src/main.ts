import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const pubClient = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
  });
  const subClient = pubClient.duplicate();

  // const io = app.get(/* IoAdapter */);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
