import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private redisClient: Redis;

  constructor(private readonly jwtService: JwtService) {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || '', // ✅ Redis 인증 추가
    });
  }

  async googleLogin(userData: any) {
    const { googleId, email, name, photo } = userData;
    const userKey = `user:${googleId}`;

    // ✅ Redis에서 기존 회원 여부 확인
    const existingUser = await this.redisClient.get(userKey);

    if (!existingUser) {
      throw new HttpException(
        { statusCode: HttpStatus.UNAUTHORIZED, message: 'User not found' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = JSON.parse(existingUser);

    // ✅ JWT 발급
    const payload = { email: user.email, sub: user.googleId };
    const token = this.jwtService.sign(payload);

    return {
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      access_token: token, // ✅ JWT 반환
      user,
    };
  }

  async registerUser(user: any, additionalInfo: any) {
    const newUser = {
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      photo: user.photo,
      age: additionalInfo.age,
      gender: additionalInfo.gender,
      interests: additionalInfo.interests,
    };

    // ValkeyDB에 회원 정보 저장
    await this.redisClient.set(
      `user:${user.googleId}`,
      JSON.stringify(newUser),
      'EX',
      86400,
    );

    // JWT 토큰 생성
    const payload = { email: newUser.email, sub: newUser.googleId };
    const token = this.jwtService.sign(payload);

    return { access_token: token, user: newUser };
  }
}
