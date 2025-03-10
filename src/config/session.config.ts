import session from 'express-session';
import Redis from 'ioredis';
import connectRedis from 'connect-redis';
import { ConfigService } from '@nestjs/config';

// 기존 방식과 동일하게 session을 전달하여 스토어 팩토리를 생성하려 했던 방식은
// 최신 버전에서 동작하지 않을 수 있으므로, 타입 단언을 사용합니다.
const RedisStore = (connectRedis as any)(session);

export const sessionConfig = (configService: ConfigService) => {
  const memorydbHost = configService.get<string>('MEMORYDB_HOST');
  const memorydbPort = configService.get<number>('MEMORYDB_PORT');
  const memorydbUseTLS = configService.get<boolean>('MEMORYDB_USE_TLS');
  const memorydbPassword = configService.get<string>('MEMORYDB_PASSWORD') || '';

  const cluster = new Redis.Cluster(
    [
      {
        host: memorydbHost,
        port: memorydbPort,
      },
    ],
    {
      dnsLookup: (address, callback) => callback(null, address),
      redisOptions: {
        tls: memorydbUseTLS ? {} : undefined,
        password: memorydbPassword,
      },
    },
  );

  // 타입 단언을 통해 constructable한 것으로 처리
  const redisStore = new (RedisStore as { new (options: any): session.Store })({
    client: cluster,
    prefix: 'myapp:',
  });

  return session({
    store: redisStore,
    secret: configService.get<string>('SESSION_SECRET'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 60000,
    },
  });
};
