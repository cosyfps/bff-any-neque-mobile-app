import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HealthStatus } from '../../domain/entities/health-status.entity';
import { HealthResponseDto } from '../../infrastructure/dtos/health-response.dto';

const FALLBACK_VERSION = '0.0.0';

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  check(): HealthResponseDto {
    const status: HealthStatus = {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      version: this.configService.get<string>('app.version') ?? FALLBACK_VERSION,
    };

    return { ...status };
  }
}
