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

    // ✅ 새로운 액세스 토큰 (1시간 만료)
    const payload = { email: user.email, sub: user.googleId };
    const newAccessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

    // ✅ 새로운 리프레시 토큰 (7일 만료)
    const newRefreshToken = this.jwtService.sign(payload, { expiresIn: '1d' });

    // ✅ Redis에 리프레시 토큰 업데이트
    user.refreshToken = newRefreshToken;
    await this.redisClient.set(userKey, JSON.stringify(user), 'EX', 86400);

    return {
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      access_token: newAccessToken, // ✅ JWT 반환
      refresh_token: newRefreshToken, // ✅ 리프레시 토큰 반환
      user,
    };
  }

  async registerUser(user: any, additionalInfo: any) {
    // JWT 토큰 생성
    const payload = { email: user.email, sub: user.googleId };
    // ✅ 액세스 토큰 (1시간 만료)
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    // ✅ 리프레시 토큰 (7일 만료)
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '1d' });

    const newUser = {
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      photo: user.photo,
      nickname: additionalInfo?.nickname || '사용자',
      monthlyBudget: additionalInfo?.monthlyBudget || 0,
      children: additionalInfo?.children || [], // 자녀 정보 배열
      refreshToken,
    };

    // ValkeyDB에 회원 정보 저장
    await this.redisClient.set(
      `user:${user.googleId}`,
      JSON.stringify(newUser),
      'EX',
      86400,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: newUser,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      // ✅ 리프레시 토큰 검증
      const decoded = this.jwtService.verify(refreshToken);

      // ✅ Redis에서 사용자 정보 가져오기
      const userKey = `user:${decoded.sub}`;
      const existingUser = await this.redisClient.get(userKey);
      if (!existingUser) {
        throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
      }

      const user = JSON.parse(existingUser);

      // ✅ 새 액세스 토큰 발급 (1시간 만료)
      const newAccessToken = this.jwtService.sign(
        { email: user.email, sub: user.googleId },
        { expiresIn: '1h' },
      );

      return { access_token: newAccessToken };
    } catch (error) {
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }
  }

  async logout(userId: string) {
    try {
      const userKey = `user:${userId}`;

      // ✅ Redis에서 사용자 데이터 조회
      const existingUser = await this.redisClient.get(userKey);
      if (!existingUser) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const user = JSON.parse(existingUser);

      // ✅ Redis에서 리프레시 토큰 삭제 (로그아웃 처리)
      delete user.refreshToken;
      delete user.accessToken;
      await this.redisClient.set(userKey, JSON.stringify(user), 'EX', 86400);

      return { statusCode: HttpStatus.OK, message: 'Logout successful' };
    } catch (error) {
      throw new HttpException(
        'Logout failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
