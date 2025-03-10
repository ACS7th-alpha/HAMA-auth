import session from 'express-session';
import { RedisStore } from 'connect-redis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

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

  // 직접 RedisStore 인스턴스를 생성
  const redisStore = new RedisStore({
    client: cluster,
    prefix: 'myapp:', // Redis 키 접두사 (옵션)
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
