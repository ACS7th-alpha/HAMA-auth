import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly jwtService: JwtService;
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
      const userData = JSON.parse(existingUser);

      // ✅ JWT 토큰 발급
      const payload = { email: userEmail, sub: userData.googleId };
      const token = this.jwtService.sign(payload);

      return {
        statusCode: HttpStatus.OK,
        message: 'Login successful',
        access_token: token, // 🔹 JWT 포함
        user: userData,
      };
    } else {
      throw new HttpException(
        { statusCode: HttpStatus.UNAUTHORIZED, message: 'User not found' },
        HttpStatus.UNAUTHORIZED,
      );
    }
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
