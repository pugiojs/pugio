import {
    LockerOptions,
    RedisClient,
} from '@pugio/types';
import {
    sleep,
} from '@pugio/utils';

class Lock {
    protected redisClient: RedisClient;
    protected expiration: number;
    protected lockName: string;

    public constructor(options: LockerOptions) {
        const {
            redisClient,
            expiration = 30,
            lockName,
        } = options;

        this.redisClient = redisClient;
        this.expiration = expiration;
        this.lockName = lockName;
    }

    public async lock() {
        const {
            lockName,
        } = this;

        let canGetLock = !await this.redisClient.get(lockName);

        while (true) {
            if (canGetLock) {
                const lockData = new Date().toISOString();
                try {
                    await this.redisClient.setNX(lockName, lockData);
                    await this.redisClient.expire(lockName, this.expiration);
                    return {
                        error: 0,
                        data: lockData,
                    };
                } catch (e) {
                    return {
                        error: 1,
                        data: (e.message || e.toString()) as string,
                    };
                }
            } else {
                await sleep();
            }

            canGetLock = !await this.redisClient.get(lockName);
        }
    }

    public async unlock() {
        const {
            lockName,
        } = this;

        try {
            const lockData = await this.redisClient.get(lockName);
            await this.redisClient.del(lockName);

            return {
                error: 0,
                data: lockData,
            };
        } catch (e) {
            return {
                error: 1,
                data: e.message || e.toString(),
            };
        }
    }
}

export default Lock;
