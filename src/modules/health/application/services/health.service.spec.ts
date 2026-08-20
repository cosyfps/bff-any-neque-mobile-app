import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  const configService = { get: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService, { provide: ConfigService, useValue: configService }],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reporta ok con la version configurada y el uptime truncado a segundos', () => {
    configService.get.mockReturnValue('1.4.2');
    jest.spyOn(process, 'uptime').mockReturnValue(42.87);

    expect(service.check()).toEqual({
      status: 'ok',
      uptimeSeconds: 42,
      version: '1.4.2',
    });
    expect(configService.get).toHaveBeenCalledWith('app.version');
  });

  it('cae a 0.0.0 cuando la version no esta configurada', () => {
    configService.get.mockReturnValue(undefined);
    jest.spyOn(process, 'uptime').mockReturnValue(0.2);

    expect(service.check()).toEqual({
      status: 'ok',
      uptimeSeconds: 0,
      version: '0.0.0',
    });
  });
});
