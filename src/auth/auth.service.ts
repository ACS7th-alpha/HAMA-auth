import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { UpdateChildDto } from './dto/update-child.dto';

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
    if (!userData || !userData.googleId) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Google ID is required',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const googleId = userData.googleId;
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

    // ✅ 액세스 토큰 (1시간 만료) - 사용자 인증에 사용
    const accessPayload = { sub: googleId, type: 'access' };
    const newAccessToken = this.jwtService.sign(accessPayload, {
      expiresIn: '1h',
    });

    // ✅ 리프레시 토큰 (7일 만료) - 갱신용, 랜덤 UUID 포함
    const refreshPayload = { sub: googleId, jti: uuidv4(), type: 'refresh' };
    const newRefreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: '1d',
    });

    // ✅ 액세스 토큰과 리프레시 토큰 갱신
    await this.redisClient.set(
      `access_token:${googleId}`,
      newAccessToken,
      'EX',
      3600,
    );
    await this.redisClient.set(
      `refresh_token:${googleId}`,
      newRefreshToken,
      'EX',
      86400 * 7,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      access_token: newAccessToken, // ✅ JWT 반환
      refresh_token: newRefreshToken, // ✅ 리프레시 토큰 반환
      user,
    };
  }

  async registerUser(user: any, additionalInfo: any) {
    const userKey = `user:${user.googleId}`;

    // ✅ Redis에서 기존 사용자 조회
    const existingUser = await this.redisClient.get(userKey);
    if (existingUser) {
      throw new HttpException(
        { statusCode: HttpStatus.CONFLICT, message: 'User already exists' },
        HttpStatus.CONFLICT,
      );
    }

    // ✅ 액세스 토큰 (1시간 만료) - 사용자 인증에 사용
    const accessPayload = { sub: user.googleId, type: 'access' };
    const newAccessToken = this.jwtService.sign(accessPayload, {
      expiresIn: '1h',
    });

    // ✅ 리프레시 토큰 (7일 만료) - 갱신용, 랜덤 UUID 포함
    const refreshPayload = {
      sub: user.googleId,
      jti: uuidv4(),
      type: 'refresh',
    };
    const newRefreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: '1d',
    });
    const newUser = {
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      photo: user.photo,
      nickname: additionalInfo?.nickname || '사용자',
      monthlyBudget: additionalInfo?.monthlyBudget || 0,
      children: additionalInfo?.children || [], // 자녀 정보 배열
    };

    // ✅ 회원 정보는 영구 저장
    await this.redisClient.set(
      `user:${user.googleId}`,
      JSON.stringify(newUser),
    );
    await this.redisClient.persist(`user:${user.googleId}`);

    // ✅ 액세스 토큰과 리프레시 토큰을 별도 저장 (자동 만료 설정)
    await this.redisClient.set(
      `access_token:${user.googleId}`,
      newAccessToken,
      'EX',
      3600,
    );
    await this.redisClient.set(
      `refresh_token:${user.googleId}`,
      newRefreshToken,
      'EX',
      86400,
    );
    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      user: newUser,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      // ✅ 리프레시 토큰 검증
      const decoded = this.jwtService.verify(refreshToken);
      const googleId = decoded.sub;

      // ✅ Redis에서 사용자 정보 가져오기
      const userKey = `user:${decoded.sub}`;
      const existingUser = await this.redisClient.get(userKey);
      if (!existingUser) {
        throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
      }

      // ✅ Redis에서 저장된 리프레시 토큰 가져오기
      const storedRefreshToken = await this.redisClient.get(
        `refresh_token:${googleId}`,
      );
      console.log(`Stored Refresh Token in Redis: ${storedRefreshToken}`); // ✅ Redis에 저장된 토큰 확인

      if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
        throw new HttpException(
          'Invalid refresh token',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const accessPayload = { sub: googleId, type: 'access' };
      const newAccessToken = this.jwtService.sign(accessPayload, {
        expiresIn: '1h',
      });
      await this.redisClient.set(
        `access_token:${googleId}`,
        newAccessToken,
        'EX',
        3600,
      );
      return { access_token: newAccessToken };
    } catch (error) {
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }
  }

  async logout(userId: any) {
    try {
      const formattedUserId = String(userId.userId); // ✅ 강제 변환
      const userKey = `user:${formattedUserId}`;

      // ✅ Redis에서 사용자 데이터 조회
      const existingUser = await this.redisClient.get(userKey);
      if (!existingUser) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const user = JSON.parse(existingUser);

      // ✅ 액세스 토큰과 리프레시 토큰 삭제
      await this.redisClient.del(`access_token:${userId.userId}`);
      await this.redisClient.del(`refresh_token:${userId.userId}`);

      return { statusCode: HttpStatus.OK, message: 'Logout successful' };
    } catch (error) {
      throw new HttpException(
        'Logout failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateUser(userId: any, updateData: any) {
    try {
      const formattedUserId = String(userId.userId);
      const userKey = `user:${formattedUserId}`;
      const existingUser = await this.redisClient.get(userKey);

      if (!existingUser) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      let user = JSON.parse(existingUser);
      user = { ...user, ...updateData }; // 기존 데이터 + 변경할 데이터 병합

      await this.redisClient.set(userKey, JSON.stringify(user));

      return {
        statusCode: HttpStatus.OK,
        message: 'User updated successfully',
        user,
      };
    } catch (error) {
      console.error('🚨 Update User Error:', error);
      throw new HttpException(
        'User update failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteUser(userId: any) {
    try {
      const formattedUserId = String(userId.userId);
      const userKey = `user:${formattedUserId}`;
      const existingUser = await this.redisClient.get(userKey);

      if (!existingUser) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // ✅ Redis에서 회원 데이터 및 토큰 삭제
      await this.redisClient.del(userKey);
      await this.redisClient.del(`access_token:${userId.userId}`);
      await this.redisClient.del(`refresh_token:${userId.userId}`);

      return {
        statusCode: HttpStatus.OK,
        message: 'User deleted successfully',
      };
    } catch (error) {
      console.error('🚨 Delete User Error:', error);
      throw new HttpException(
        'User deletion failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async addChild(googleId: string, childData: UpdateChildDto) {
    const userKey = `user:${googleId}`;
    const existingUser = await this.redisClient.get(userKey);

    if (!existingUser) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    let user = JSON.parse(existingUser);

    // ✅ 중복 추가 방지 (이름 기준)
    const isChildExists = user.children.some(
      (child) => child.name === childData.name,
    );
    if (isChildExists) {
      throw new HttpException(
        'Child with this name already exists',
        HttpStatus.CONFLICT,
      );
    }

    // ✅ 기존 user.children 배열에 아기 정보 추가
    user.children.push(childData);

    // ✅ 업데이트된 사용자 정보를 Redis에 저장
    await this.redisClient.set(userKey, JSON.stringify(user));

    return {
      statusCode: HttpStatus.OK,
      message: 'Child added successfully',
      user, // 업데이트된 전체 사용자 정보 반환
    };
  }

  async updateChild(
    googleId: string,
    childName: string,
    updateData: UpdateChildDto,
  ) {
    const userKey = `user:${googleId}`;
    const existingUser = await this.redisClient.get(userKey);

    if (!existingUser) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    let user = JSON.parse(existingUser);

    const childIndex = user.children.findIndex(
      (child) => child.name === childName,
    );
    if (childIndex === -1) {
      throw new HttpException('Child not found', HttpStatus.NOT_FOUND);
    }

    // ✅ 기존 데이터를 업데이트
    user.children[childIndex] = { ...user.children[childIndex], ...updateData };

    await this.redisClient.set(userKey, JSON.stringify(user));

    return {
      statusCode: HttpStatus.OK,
      message: 'Child updated successfully',
      children: user.children,
    };
  }

  async deleteChild(googleId: string, childName: string) {
    const userKey = `user:${googleId}`;
    const existingUser = await this.redisClient.get(userKey);

    if (!existingUser) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    let user = JSON.parse(existingUser);

    const initialLength = user.children.length;
    user.children = user.children.filter((child) => child.name !== childName);

    if (user.children.length === initialLength) {
      throw new HttpException('Child not found', HttpStatus.NOT_FOUND);
    }

    await this.redisClient.set(userKey, JSON.stringify(user));

    return {
      statusCode: HttpStatus.OK,
      message: 'Child deleted successfully',
      children: user.children,
    };
  }
}
