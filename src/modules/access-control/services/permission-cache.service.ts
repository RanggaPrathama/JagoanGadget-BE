import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@module/redis/redis.provider';

@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);
  private readonly ttl = 300; // 5 minutes in seconds

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Redis key for a user's cached permission-code list.
   * @param userId - Better Auth user id.
   * @returns Key string `user:{userId}:perms`.
   */
  private userPermsKey(userId: string): string {
    return `user:${userId}:perms`;
  }

  /**
   * Redis key holding the set of user ids assigned to a role (reverse index for
   * bulk cache invalidation when a role's permissions change).
   * @param roleId - Role UUID.
   * @returns Key string `role:{roleId}:users`.
   */
  private roleUsersKey(roleId: string): string {
    return `role:${roleId}:users`;
  }

  /**
   * Read a user's cached permission codes. On any Redis error, logs and returns
   * `null` so the caller falls back to the database (fail-open for availability).
   * @param userId - Better Auth user id.
   * @returns Parsed `string[]` of permission codes, or `null` when absent/error.
   */
  async get(userId: string): Promise<string[] | null> {
    try {
      const data = await this.redis.get(this.userPermsKey(userId));
      return data ? JSON.parse(data) : null;
    } catch (err) {
      this.logger.error(
        { userId, err },
        'Redis get failed for user permissions, falling back to DB',
      );
      return null;
    }
  }

  /**
   * Cache a user's permission codes with a 5-minute TTL (`this.ttl`).
   * Redis failures are swallowed (logged only) — caching is a perf optimization,
   * not a correctness requirement.
   * @param userId - Better Auth user id.
   * @param permissions - Permission-code list to store.
   * @returns Resolves when the write succeeds or is logged-and-ignored on error.
   */
  async set(userId: string, permissions: string[]): Promise<void> {
    try {
      await this.redis.setex(
        this.userPermsKey(userId),
        this.ttl,
        JSON.stringify(permissions),
      );
    } catch (err) {
      this.logger.error({ userId, err }, 'Redis setex failed');
    }
  }

  /**
   * Drop a single user's cached permission list.
   * @param userId - Better Auth user id.
   * @returns Resolves when the key is deleted or the error is logged-and-ignored.
   */
  async invalidate(userId: string): Promise<void> {
    try {
      await this.redis.del(this.userPermsKey(userId));
    } catch (err) {
      this.logger.error({ userId, err }, 'Redis del failed');
    }
  }

  /**
   * Add a user id to a role's reverse-index set (so the role can later invalidate
   * every member's cache at once).
   * @param userId - Better Auth user id.
   * @param roleId - Role UUID.
   * @returns Resolves when the membership is recorded or the error is logged-and-ignored.
   */
  async trackUserRole(userId: string, roleId: string): Promise<void> {
    try {
      await this.redis.sadd(this.roleUsersKey(roleId), userId);
    } catch (err) {
      this.logger.error({ userId, roleId, err }, 'Redis sadd failed');
    }
  }

  /**
   * Remove a user id from a role's reverse-index set (call when a role is unassigned).
   * @param userId - Better Auth user id.
   * @param roleId - Role UUID.
   * @returns Resolves when the membership is removed or the error is logged-and-ignored.
   */
  async untrackUserRole(userId: string, roleId: string): Promise<void> {
    try {
      await this.redis.srem(this.roleUsersKey(roleId), userId);
    } catch (err) {
      this.logger.error({ userId, roleId, err }, 'Redis srem failed');
    }
  }

  /**
   * Bulk-invalidate the permission cache for every user currently assigned to a role,
   * then delete the role's reverse-index set. Runs inside a Redis pipeline. A no-op
   * (returns early) when the role has no tracked users.
   * @param roleId - Role UUID.
   * @returns Resolves when the pipeline executes or the error is logged-and-ignored.
   */
  async invalidateByRoleId(roleId: string): Promise<void> {
    try {
      const userIds = await this.redis.smembers(this.roleUsersKey(roleId));
      if (userIds.length === 0) return;

      const pipeline = this.redis.pipeline();
      for (const userId of userIds) {
        pipeline.del(this.userPermsKey(userId));
      }
      pipeline.del(this.roleUsersKey(roleId));
      await pipeline.exec();
    } catch (err) {
      this.logger.error({ roleId, err }, 'Redis invalidateByRoleId failed');
    }
  }
}
