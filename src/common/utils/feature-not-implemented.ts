import { NotImplementedException } from '@nestjs/common';

/** Replace this scaffold boundary when the complete use case is implemented. */
export function featureNotImplemented(requirement: string): never {
  throw new NotImplementedException(
    `Scaffold only. Pending implementation: ${requirement}`,
  );
}
