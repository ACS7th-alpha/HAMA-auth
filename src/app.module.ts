import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { sessionConfig } from './config/session.config';
import passport from 'passport';
import { NestFactory } from '@nestjs/core';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
})
export class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(sessionConfig(configService));
  app.use(passport.initialize());
  app.use(passport.session());

  await app.listen(3000);
}

bootstrap();
