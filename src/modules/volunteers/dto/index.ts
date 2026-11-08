import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VolunteerApplicationStatus } from '../../../common/enums/index.js';

export class CreateVolunteerDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'ID của sự kiện muốn đăng ký tham gia (phải ở trạng thái PUBLISHED)',
    example: '30000000-0000-4000-8000-000000000001',
  })
  @IsUUID('4', { message: 'eventId phải là UUID v4 hợp lệ' })
  eventId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'ID của vị trí/vai trò tình nguyện viên trong sự kiện',
    example: '40000000-0000-4000-8000-000000000001',
  })
  @IsUUID('4', { message: 'volunteerRoleId phải là UUID v4 hợp lệ' })
  volunteerRoleId!: string;

  @ApiPropertyOptional({
    description:
      'Ghi chú, lời nhắn hoặc giới thiệu kỹ năng của tình nguyện viên',
    example: 'Tôi có kinh nghiệm lái xe và hỗ trợ vận chuyển cứu trợ.',
  })
  @IsOptional()
  @IsString({ message: 'notes phải là chuỗi ký tự' })
  notes?: string;
}

export class ReviewVolunteerDto {
  @ApiProperty({
    enum: [
      VolunteerApplicationStatus.APPROVED,
      VolunteerApplicationStatus.REJECTED,
    ],
    description: 'Quyết định xét duyệt đơn ứng tuyển: APPROVED hoặc REJECTED',
    example: VolunteerApplicationStatus.APPROVED,
  })
  @IsIn(
    [VolunteerApplicationStatus.APPROVED, VolunteerApplicationStatus.REJECTED],
    { message: 'status chỉ nhận giá trị APPROVED hoặc REJECTED' },
  )
  status!: VolunteerApplicationStatus;
}
