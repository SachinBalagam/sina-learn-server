import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './require-permission.decorator';
import { Permission, RolePermissions, Permissions } from './permission.registry';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return true;
    }

    const userPermissions = this.resolvePermissions(user);

    if (!userPermissions || userPermissions.length === 0) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
    }

    const hasAll = requiredPermissions.every((p) => userPermissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
    }

    return true;
  }

  private resolvePermissions(user: any): string[] {
    if (user.role === 'PLATFORM_SUPER_ADMIN') {
      return Object.values(Permissions);
    }
    if (user.permissions && user.permissions.length > 0) {
      return user.permissions;
    }
    const role = user.role as string;
    return (RolePermissions as Record<string, string[]>)[role] || [];
  }
}

