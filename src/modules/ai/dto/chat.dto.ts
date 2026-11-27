import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ChatHistoryItemDto {
  @ApiProperty({ enum: ['user', 'model'] })
  @IsIn(['user', 'model'])
  role!: 'user' | 'model';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text!: string;
}

export class GuestChatRequestDto {
  @ApiProperty({ example: 'Hiện tại có chiến dịch cứu trợ nào đang mở?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({ type: [ChatHistoryItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];
}

export class SendConversationMessageDto {
  @ApiPropertyOptional({
    description: 'UUID của cuộc hội thoại hiện có. Bỏ trống để tự tạo mới.',
  })
  @IsUUID()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({ example: 'Đơn quyên góp OA-2026-001 của tôi tới đâu rồi?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;
}

export class RenameConversationDto {
  @ApiProperty({ example: 'Tra cứu chiến dịch miền Trung' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;
}

export class UpdateFeedbackDto {
  @ApiPropertyOptional({ enum: ['like', 'dislike', null], nullable: true })
  @IsIn(['like', 'dislike', null])
  @IsOptional()
  feedback!: 'like' | 'dislike' | null;
}

export class RegenerateMessageDto {
  @ApiPropertyOptional({
    description: 'UUID của tin nhắn assistant cần tạo lại.',
  })
  @IsUUID()
  @IsOptional()
  targetMessageId?: string;
}
