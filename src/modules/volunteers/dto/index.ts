import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VolunteerApplicationStatus } from '../../../common/enums/index.js';

export class CreateVolunteerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  eventId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  volunteerRoleId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReviewVolunteerDto {
  @ApiProperty({
    enum: [
      VolunteerApplicationStatus.APPROVED,
      VolunteerApplicationStatus.REJECTED,
    ],
  })
  @IsIn([
    VolunteerApplicationStatus.APPROVED,
    VolunteerApplicationStatus.REJECTED,
  ])
  status!: VolunteerApplicationStatus;
}
