import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      message = typeof res === 'string' ? res : res.message || exception.message;
      code = typeof res === 'object' && res.code ? res.code : 'HTTP_ERROR';
    }

    if (status >= 500) {
      this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : exception);
    } else {
      this.logger.warn(`Client Error HTTP ${status} [${code}]: ${message}`);
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
      },
    });
  }
}
