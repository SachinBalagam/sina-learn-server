import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: any) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = (result.error.errors ?? result.error.issues ?? []).map((e: any) => ({
        path: e.path?.join('.') ?? '',
        message: e.message,
      }));
      throw new BadRequestException({
        message: 'Validation failed',
        errors,
      });
    }
    return result.data;
  }
}
