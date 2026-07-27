import { IsUUID } from 'class-validator';

export class CertificateIdParams {
  @IsUUID()
  id: string;
}
