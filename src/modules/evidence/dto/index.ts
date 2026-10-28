import { Equals, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvidenceReviewStatus } from '../../../common/enums/index.js';

export class CreateEvidenceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tripId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  distributionPointId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  distributionRecordId?: string;

  @ApiProperty({
    enum: [true],
    description:
      'Uploader confirms cropping/blurring identifiable people or obtaining consent.',
  })
  @Equals(true)
  privacyConfirmed!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  caption?: string;
}

export class ReviewEvidenceDto {
  @ApiProperty({
    enum: [EvidenceReviewStatus.APPROVED, EvidenceReviewStatus.REJECTED],
  })
  @IsIn([EvidenceReviewStatus.APPROVED, EvidenceReviewStatus.REJECTED])
  status!: EvidenceReviewStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
