import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateEvidenceDto, ReviewEvidenceDto } from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { featureNotImplemented } from '../../common/utils/feature-not-implemented.js';
import { FILE_STORAGE, type FileStorage } from '../storage/storage.types.js';

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
  ) {}

  async createEvidence(
    _actor: AuthenticatedUser,
    _dto: CreateEvidenceDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR25: assigned volunteer/Organizer, multipart image validation, privacy confirmation and pending review',
    );
  }

  async getEvidenceByTrip(
    _actor: AuthenticatedUser,
    _tripId: string,
  ): Promise<never> {
    return featureNotImplemented(
      'FR03/FR25: authorized internal evidence list',
    );
  }

  async reviewEvidence(
    _actor: AuthenticatedUser,
    _id: string,
    _dto: ReviewEvidenceDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR25/FR20: Event Organizer review and audit log',
    );
  }
}
