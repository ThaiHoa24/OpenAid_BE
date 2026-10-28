import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

/** Business services append logs inside the same transaction as their state changes. */
@Injectable()
export class TransparencyRepository {
  append(
    transaction: Prisma.TransactionClient,
    data: Prisma.TransparencyLogUncheckedCreateInput,
  ) {
    return transaction.transparencyLog.create({ data });
  }
}
