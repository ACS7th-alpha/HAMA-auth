// src/auth/auth.controller.ts
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Google 인증 요청 엔드포인트
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport가 리다이렉션 처리합니다.
  }

  // Google 인증 콜백 엔드포인트
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req) {
    // 인증 후 AuthService에서 추가 작업 수행
    return this.authService.googleLogin(req);
  }
}
