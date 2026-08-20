import { ArgumentsHost, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let json: jest.Mock;
  let status: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpExceptionFilter],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);

    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
  });

  it('responde { statusCode, message } ante una HttpException con payload string', () => {
    filter.catch(new HttpException('Credenciales invalidas', HttpStatus.UNAUTHORIZED), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: 'Credenciales invalidas',
    });
  });

  it('concatena los mensajes del ValidationPipe en un solo string', () => {
    filter.catch(new BadRequestException(['email must be an email', 'password too short']), host);

    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'email must be an email, password too short',
    });
  });

  it('toma el message string de un payload objeto', () => {
    filter.catch(new BadRequestException('Body invalido'), host);

    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Body invalido',
    });
  });

  it('cae al message de la excepcion cuando el payload objeto no trae message', () => {
    filter.catch(new HttpException({ error: 'Conflict' }, HttpStatus.CONFLICT), host);

    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      message: 'Http Exception',
    });
  });

  it('convierte un error no controlado en 500 generico sin filtrar el detalle', () => {
    filter.catch(new Error('connection string leaked'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  });

  it('no filtra el detalle de una HttpException 5xx', () => {
    filter.catch(new HttpException('supabase timeout on trainers', 503), host);

    expect(json).toHaveBeenCalledWith({
      statusCode: 503,
      message: 'Internal server error',
    });
  });

  it('maneja un throw de algo que no es Error', () => {
    filter.catch('boom', host);

    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  });
});
