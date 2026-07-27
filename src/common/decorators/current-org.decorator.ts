import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentOrg = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const org = request.org || (request.user?.organizationId ? { id: request.user.organizationId } : null);
  return data ? org?.[data] : org;
});
