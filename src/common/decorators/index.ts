import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { APP_CONSTANTS } from '../constants/index.js';
import { SystemRole } from '../enums/index.js';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.user) return null;
    return data ? request.user[data] : request.user;
  },
);

export const Roles = (...roles: SystemRole[]) =>
  SetMetadata(APP_CONSTANTS.ROLES_KEY, roles);

export const Public = () => SetMetadata(APP_CONSTANTS.IS_PUBLIC_KEY, true);
