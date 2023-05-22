import { applyDecorators, SetMetadata } from '@nestjs/common';

export const SKIP_AUTH_KEY = 'SKIP_AUTH';

export function SkipAuth() {
  return applyDecorators(SetMetadata(SKIP_AUTH_KEY, true));
}
