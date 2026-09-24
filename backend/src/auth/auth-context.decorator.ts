import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedContext } from './authenticated-context.js';

export const GetAuthContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedContext => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.user) {
      throw new UnauthorizedException('Authentication context is missing');
    }

    return request.user as AuthenticatedContext;
  },
);
