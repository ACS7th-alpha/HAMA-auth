import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  private redisClient: Redis;

  constructor() {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || '', // ✅ Redis 인증 추가
    });
  }

  async googleLogin(req) {
    if (!req.user) {
      throw new HttpException('No user from Google', HttpStatus.BAD_REQUEST);
    }

    const userEmail = req.user.email;
    const userKey = `user:${userEmail}`;

    // ✅ Valkey(=Redis)에서 회원 정보 조회
    const existingUser = await this.redisClient.get(userKey);

    if (existingUser) {
      // ✅ 기존 회원이면 200 OK + Valkey 데이터 반환
      return {
        statusCode: HttpStatus.OK,
        message: 'Existing user found',
        user: JSON.parse(existingUser),
      };
    } else {
      // ❌ 없는 유저면 401 Unauthorized 반환
      throw new HttpException(
        { statusCode: HttpStatus.UNAUTHORIZED, message: 'User not found' },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
