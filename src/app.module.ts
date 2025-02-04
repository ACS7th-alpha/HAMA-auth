import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // ✅ 환경 변수 글로벌 설정
    AuthModule, // ✅ 인증 모듈 포함
  ],
})
export class AppModule {}
