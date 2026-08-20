import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', description: 'Estado global del BFF' })
  status: 'ok';

  @ApiProperty({ example: 42, description: 'Segundos desde que arranco el proceso' })
  uptimeSeconds: number;

  @ApiProperty({ example: '0.1.0', description: 'Version desplegada' })
  version: string;
}
