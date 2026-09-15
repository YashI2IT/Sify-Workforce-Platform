import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedContext } from './authenticated-context.js';

export const GetAuthContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedContext => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.user) {
      throw new UnauthorizedException('Authentication context is missing (Blocked on Keycloak integration)');
    }

    return request.user as AuthenticatedContext;
  },
);
