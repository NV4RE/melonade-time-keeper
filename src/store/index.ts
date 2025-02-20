import { Timer } from '@melonade/melonade-declaration';

export interface ITimerUpdate {
  ackTimeout?: boolean;
  timeout?: boolean;
  taskId: string;
}

export interface IStore {
  isHealthy(): boolean;
}

export type WatcherCallback = (
  type: 'DELAY' | 'TIMEOUT' | 'ACK_TIMEOUT',
  taskId: string,
) => void;

export interface ITimerInstanceStore extends IStore {
  get(taskId: string): Promise<Timer.ITimerData>;
  create(taskData: Timer.ITimerData): Promise<Timer.ITimerData>;
  delete(taskId: string): Promise<any>;
  update(timerUpdate: ITimerUpdate): Promise<Timer.ITimerData>;
  watch(callback: WatcherCallback): void;
}

export interface ITimerLeaderStore extends IStore {
  isLeader(): boolean;
  list(): number[];
}

export class TimerInstanceStore {
  client: ITimerInstanceStore;

  setClient(client: ITimerInstanceStore) {
    if (this.client) throw new Error('Already set client');
    this.client = client;
  }

  get(taskId: string) {
    return this.client.get(taskId);
  }

  create(timerData: Timer.ITimerData) {
    return this.client.create(timerData);
  }

  delete(taskId: string) {
    return this.client.delete(taskId);
  }

  update(timerUpdate: ITimerUpdate) {
    return this.client.update(timerUpdate);
  }

  watch(callback: WatcherCallback) {
    return this.client.watch(callback);
  }
}

export class TimerLeaderStore {
  client: ITimerLeaderStore;

  setClient(client: ITimerLeaderStore) {
    if (this.client) throw new Error('Already set client');
    this.client = client;
  }

  isLeader() {
    return this.client.isLeader();
  }

  list() {
    return this.client.list();
  }
}

export const timerInstanceStore = new TimerInstanceStore();
export const timerLeaderStore = new TimerLeaderStore();
