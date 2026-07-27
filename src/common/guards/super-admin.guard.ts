import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'PLATFORM_SUPER_ADMIN') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Super admin access required' });
    }

    return true;
  }
}