import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { HealthService } from '../../application/services/health.service';
import { HealthResponseDto } from '../dtos/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Estado del BFF' })
  @ApiOkResponse({ type: HealthResponseDto })
  check(): HealthResponseDto {
    return this.healthService.check();
  }
}
