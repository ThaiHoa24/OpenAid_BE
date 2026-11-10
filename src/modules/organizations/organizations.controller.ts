import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service.js';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/index.js';
import { AddOrganizationMemberDto } from './dto/organization-member.dto.js';
import { CurrentUser, Public } from '../../common/decorators/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'ORG-01: Danh sách các tổ chức cứu trợ (khám phá công khai, có phân trang)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các tổ chức cứu trợ trên nền tảng',
  })
  getAll(@Query() query: PaginationDto) {
    return this.service.getAllOrganizations(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'ORG-02: Xem thông tin chi tiết một tổ chức cứu trợ theo ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin chi tiết của tổ chức',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức' })
  getById(@Param('id') id: string) {
    return this.service.getOrganizationById(id);
  }

  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({
    summary:
      'ORG-03: Đăng ký thành lập tổ chức cứu trợ mới (trạng thái ban đầu PENDING, chờ Admin duyệt)',
  })
  @ApiResponse({
    status: 201,
    description:
      'Tạo tổ chức thành công, tài khoản khởi tạo được gán vai trò ORGANIZER',
  })
  @ApiResponse({
    status: 409,
    description: 'Mã định danh tổ chức (code) đã tồn tại',
  })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.service.createOrganization(actor, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @ApiOperation({
    summary:
      'ORG-04: Cập nhật thông tin tổ chức (chỉ Organizer của tổ chức hoặc Admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thông tin tổ chức thành công',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền Organizer trên tổ chức này',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.service.updateOrganization(actor, id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Post(':id/members')
  @ApiOperation({
    summary:
      'ORG-05: Mời / thêm thành viên vào tổ chức (vai trò MEMBER hoặc ORGANIZER)',
  })
  @ApiResponse({
    status: 201,
    description: 'Thêm thành viên vào tổ chức thành công',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền Organizer trên tổ chức này',
  })
  @ApiResponse({
    status: 409,
    description: 'Người dùng đã là thành viên của tổ chức',
  })
  addMember(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddOrganizationMemberDto,
  ) {
    return this.service.addMember(actor, id, dto);
  }
}
