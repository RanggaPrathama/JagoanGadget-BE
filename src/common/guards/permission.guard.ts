import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { AccessControlService } from '@module/access-control/services/access-control.service';
import { PermissionCacheService } from '@module/access-control/services/permission-cache.service';
import { auth } from '@lib/auth';

// Key used by @thallesp/nestjs-better-auth's @AllowAnonymous() decorator.
// Its AuthGuard reads this; our global PermissionGuard must honor it too so
// public routes (e.g. /metrics) don't log or run permission checks.
const PUBLIC_KEY = 'PUBLIC';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControl: AccessControlService,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    this.logger.debug({ requiredPermission }, 'Checking permission for route');

    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();

    // get user id from auth library
    const sessionData = await auth.api.getSession({
      headers: request.headers,
    });

    const userId = sessionData?.user?.id;
    if (!userId) {
      this.logger.warn(
        'Attempt to access protected route without authentication',
      );
      throw new ForbiddenException('Not authenticated');
    }

    // Check cache first, fall back to service (handles superadmin + DB query)
    const cached = await this.permissionCache.get(userId);
    this.logger.debug({ cached }, 'Cached permissions for user');
    const permissions =
      cached ?? (await this.accessControl.getUserPermissionCodes(userId));

    if (!permissions.includes(requiredPermission)) {
      throw new ForbiddenException(`Missing permission: ${requiredPermission}`);
    }

    return true;
  }
}
