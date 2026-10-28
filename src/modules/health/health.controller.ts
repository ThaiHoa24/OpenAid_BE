import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/index.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Public()
  @Get('live')
  live() {
    return { status: 'ok' };
  }
}
