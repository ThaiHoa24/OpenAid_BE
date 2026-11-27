import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public } from '../../common/decorators/index.js';
import { AiService } from './ai.service.js';
import {
  GuestChatRequestDto,
  RegenerateMessageDto,
  RenameConversationDto,
  SendConversationMessageDto,
  UpdateFeedbackDto,
} from './dto/chat.dto.js';

@ApiTags('AI Assistant')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Public()
  @Post('chat')
  @ApiOperation({
    summary: 'Chat trực tiếp với trợ lý AI OpenAid (cho khách chưa đăng nhập)',
  })
  async chatGuest(@Body() dto: GuestChatRequestDto) {
    return this.aiService.chatGuest(dto.message, dto.history);
  }

  @ApiBearerAuth('JWT-auth')
  @Get('conversations')
  @ApiOperation({
    summary: 'Lấy danh sách lịch sử hội thoại của tài khoản đang đăng nhập',
  })
  async listConversations(@CurrentUser('id') userId: string) {
    return this.aiService.listConversations(userId);
  }

  @ApiBearerAuth('JWT-auth')
  @Post('conversations/messages')
  @ApiOperation({
    summary: 'Gửi tin nhắn và đồng bộ lịch sử hội thoại theo tài khoản',
  })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: SendConversationMessageDto,
  ) {
    return this.aiService.sendUserMessage(userId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch('conversations/:id')
  @ApiOperation({ summary: 'Đổi tên cuộc hội thoại' })
  async renameConversation(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameConversationDto,
  ) {
    return this.aiService.renameConversation(userId, id, dto.title);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Xóa cuộc hội thoại' })
  async deleteConversation(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.aiService.deleteConversation(userId, id);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch('messages/:id/feedback')
  @ApiOperation({ summary: 'Lưu đánh giá like/dislike cho tin nhắn' })
  async updateFeedback(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeedbackDto,
  ) {
    return this.aiService.updateMessageFeedback(userId, id, dto.feedback);
  }

  @ApiBearerAuth('JWT-auth')
  @Post('conversations/:id/regenerate')
  @ApiOperation({ summary: 'Tạo lại câu trả lời cho cuộc hội thoại' })
  async regenerateMessage(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegenerateMessageDto,
  ) {
    return this.aiService.regenerateMessage(userId, id, dto.targetMessageId);
  }
}
