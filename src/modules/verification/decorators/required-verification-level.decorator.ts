import { SetMetadata } from '@nestjs/common';
import { VerificationLevel } from '../../users/entities/user.entity';

export const RequiredVerificationLevel = (level: VerificationLevel) =>
  SetMetadata('requiredVerificationLevel', level);
