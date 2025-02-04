import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3001);
  // ✅ CORS 활성화
  app.enableCors();
  /* app.enableCors({
    origin: 'http://localhost:5173', // ✅ React, Vue 등 프론트엔드 도메인
  });
  */
}
bootstrap();
