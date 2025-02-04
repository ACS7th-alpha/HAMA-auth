// src/auth/auth.controller.ts
import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  Body,
} from '@nestjs/common';
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
  async googleAuthRedirect(@Req() req, @Res() res) {
    const loginResponse = await this.authService.googleLogin(req);

    // ✅ 로그인 성공 시 JWT 토큰과 함께 프론트엔드로 리디렉트
    return res.redirect(
      `http://localhost:3000/dashboard?token=${loginResponse.access_token}`,
    );
  }

  @Post('register')
  async registerUser(@Body() body) {
    return await this.authService.registerUser(body.user, body.additionalInfo);
  }
}
