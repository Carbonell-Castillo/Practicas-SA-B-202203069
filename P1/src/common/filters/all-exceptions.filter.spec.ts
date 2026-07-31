import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { SolicitudNotFoundError } from '../../solicitudes/errors/solicitud-not-found.error';
import { AllExceptionsFilter } from './all-exceptions.filter';

function buildHost(): {
  host: ArgumentsHost;
  status: jest.Mock;
  json: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const request = { url: '/solicitudes', method: 'POST' };

  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('convierte SolicitudNotFoundError en 404 con el mensaje del error de dominio', () => {
    const { host, status, json } = buildHost();

    filter.catch(new SolicitudNotFoundError('id-inexistente'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: expect.stringContaining('id-inexistente'),
        error: 'Not Found',
      }),
    );
  });

  it('conserva el status y los mensajes de una HttpException (p. ej. de ValidationPipe)', () => {
    const { host, status, json } = buildHost();
    const exception = new BadRequestException([
      'prioridad must not be less than 1',
    ]);

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['prioridad must not be less than 1'],
      }),
    );
  });

  it('nunca expone el mensaje de un error inesperado (p. ej. de Prisma) y responde 500 genérico', () => {
    const { host, status, json } = buildHost();
    const sensitiveError = new Error(
      'password authentication failed for user "solicitudes_user"',
    );

    filter.catch(sensitiveError, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const [body] = json.mock.calls[0] as [{ message: string }];
    expect(body.message).toBe(
      'Ha ocurrido un error interno. Intenta nuevamente más tarde.',
    );
    expect(JSON.stringify(body)).not.toContain('solicitudes_user');
  });
});
