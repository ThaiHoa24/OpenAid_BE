import type { SystemRole } from '../enums/index.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  systemRole: SystemRole;
}
