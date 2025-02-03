import session from 'express-session';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';
import { ConfigService } from '@nestjs/config';

export const sessionConfig = (configService: ConfigService) => {
  // Redis 클라이언트 생성
  const redisClient = createClient({
    url: `redis://${configService.get<string>('REDIS_HOST')}:${configService.get<number>('REDIS_PORT')}`,
  });

  // Redis 연결
  redisClient.connect().catch(console.error);

  // RedisStore 초기화
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'myapp:', // Redis 키에 접두사 추가 (옵션)
  });

  // 세션 설정 반환
  return session({
    store: redisStore,
    secret: configService.get<string>('SESSION_SECRET'), // 세션 암호화 키
    resave: false, // 세션을 강제로 다시 저장하지 않음
    saveUninitialized: false, // 초기화되지 않은 세션을 저장하지 않음
    cookie: {
      secure: false, // HTTPS에서만 쿠키를 전송 (개발 환경에서는 false)
      httpOnly: true, // 클라이언트 JavaScript에서 쿠키 접근 방지
      maxAge: 60000, // 쿠키 만료 시간 (1분)
    },
  });
};
