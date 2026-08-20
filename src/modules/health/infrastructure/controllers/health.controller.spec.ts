import { Test, TestingModule } from '@nestjs/testing';

import { HealthService } from '../../application/services/health.service';
import { HealthResponseDto } from '../dtos/health-response.dto';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  const healthService = { check: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('devuelve el modelo que arma el servicio', () => {
    const expected: HealthResponseDto = { status: 'ok', uptimeSeconds: 7, version: '0.1.0' };
    healthService.check.mockReturnValue(expected);

    expect(controller.check()).toBe(expected);
    expect(healthService.check).toHaveBeenCalledTimes(1);
  });

  it('propaga el error que lanza el servicio', () => {
    healthService.check.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(() => controller.check()).toThrow('boom');
  });
});
