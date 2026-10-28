import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';

export const createValidationPipe = (options?: ValidationPipeOptions) => {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: false,
    },
    ...options,
  });
};
