import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  XLSX = 'xlsx',
}

export class ExportReportQueryDto {
  @ApiPropertyOptional({
    enum: ReportFormat,
    default: ReportFormat.PDF,
    description: 'Định dạng xuất báo cáo nghiệm thu: pdf | csv | xlsx',
    example: ReportFormat.PDF,
  })
  @IsOptional()
  @IsEnum(ReportFormat)
  format: ReportFormat = ReportFormat.PDF;
}

