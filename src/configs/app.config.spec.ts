import appConfig, { APP_CONFIG_KEY } from './app.config';

describe('appConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env['PORT'];
    delete process.env['APP_VERSION'];
    delete process.env['CORS_ORIGINS'];
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('se registra bajo la clave app', () => {
    expect(APP_CONFIG_KEY).toBe('app');
  });

  it('usa los defaults cuando no hay env vars', () => {
    expect(appConfig()).toEqual({
      port: 3000,
      version: '0.1.0',
      corsOrigins: ['capacitor://localhost', 'http://localhost', 'http://localhost:4200'],
    });
  });

  it('lee port, version y origenes desde el entorno', () => {
    process.env['PORT'] = '8080';
    process.env['APP_VERSION'] = '2.0.0';
    process.env['CORS_ORIGINS'] = 'https://neque.cl, capacitor://localhost';

    expect(appConfig()).toEqual({
      port: 8080,
      version: '2.0.0',
      corsOrigins: ['https://neque.cl', 'capacitor://localhost'],
    });
  });

  it('ignora un PORT no numerico o invalido', () => {
    process.env['PORT'] = 'no-soy-un-puerto';
    expect(appConfig().port).toBe(3000);

    process.env['PORT'] = '0';
    expect(appConfig().port).toBe(3000);
  });

  it('ignora un CORS_ORIGINS vacio o de puras comas', () => {
    process.env['CORS_ORIGINS'] = ' , ,';
    expect(appConfig().corsOrigins).toEqual([
      'capacitor://localhost',
      'http://localhost',
      'http://localhost:4200',
    ]);
  });
});
