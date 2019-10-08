import { IStore } from '../../store';
import ioredis from 'ioredis';

export class RedisStore implements IStore {
  client: ioredis.Redis;
  connected: boolean = false;
  constructor(redisOptions: ioredis.RedisOptions) {
    this.client = new ioredis(redisOptions);

    this.client
      .on('connect', () => {
        this.connected = true;
      })
      .on('close', () => {
        this.connected = false;
      });
  }

  isHealthy(): boolean {
    return this.connected;
  }

  setValue(key: string, value: string): Promise<string> {
    return this.client.set(key, value);
  }

  setValueExpire(key: string, value: string, ms: number): Promise<string> {
    return this.client.set(key, value, 'PX', ms);
  }

  unsetValue(keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  getValue(key: string): Promise<string> {
    return this.client.get(key);
  }

  checkKeys(keys: string[]) {
    return this.client.exists(...keys);
  }
}

export class RedisSubscriber implements IStore {
  client: ioredis.Redis;
  connected: boolean = false;
  constructor(redisOptions: ioredis.RedisOptions, patterns: string[]) {
    this.client = new ioredis(redisOptions);

    this.client
      .on('connect', () => {
        this.connected = true;
      })
      .on('close', () => {
        this.connected = false;
      });

    this.client.config('SET', 'notify-keyspace-events', 'xK');

    this.client.psubscribe(
      ...patterns.map(
        (pattern: string) => `__keyspace@${redisOptions.db}__:${pattern}`,
      ),
    );
  }

  isHealthy(): boolean {
    return this.connected;
  }
}
