import * as config from './config';
import * as store from './store';
// import { TimerInstanceMongooseStore } from './store/mongoose/timerInstance';
import { TimerInstanceRedisStore } from './store/redis/timerInstance';
import { StoreType } from './store';
import './kafka';
import { executor as eventExecutor } from './eventWatcher';
import { executor as storeExecutor } from './storeWatcher';
import { executor as taskExecutor } from './taskWatcher';
import { executor as timerExecutor } from './timerWatcher';

switch (config.timerInstanceStoreConfig.type) {
  // case StoreType.Memory:
  //   store.workflowInstanceStore.setClient(new MemoryStore());
  //   break;
  // case StoreType.MongoDB:
  //   store.timerInstanceStore.setClient(
  //     new TimerInstanceMongooseStore(
  //       config.timerInstanceStoreConfig.mongoDBConfig.uri,
  //       config.timerInstanceStoreConfig.mongoDBConfig.options,
  //     ),
  //   );
  //   break;
  case StoreType.Redis:
    store.timerInstanceStore.setClient(
      new TimerInstanceRedisStore(config.timerInstanceStoreConfig.redisConfig),
    );
    break;
  default:
    throw new Error(
      `TimerInstance Store: ${config.timerInstanceStoreConfig.type} is invalid`,
    );
}

storeExecutor();
timerExecutor();
taskExecutor();
eventExecutor();
