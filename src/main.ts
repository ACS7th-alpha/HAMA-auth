import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { sessionConfig } from './config/session.config';
import passport from 'passport';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // ✅ CORS 활성화 (필요한 경우)
  app.enableCors({
    origin: 'http://localhost:3000', // ✅ React/Vue 프론트엔드 주소
    credentials: true, // 세션 사용을 위해 credentials 활성화
  });

  // ✅ 세션 및 Passport 설정 (OAuth 로그인 및 인증용)
  app.use(sessionConfig(configService));
  app.use(passport.initialize());
  app.use(passport.session());

  // ✅ 하나의 서버에서 실행
  const PORT = process.env.PORT || 3001;
  await app.listen(PORT);
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
}

bootstrap();
