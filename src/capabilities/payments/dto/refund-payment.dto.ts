import { IsOptional, IsInt, Min } from 'class-validator';

export class RefundPaymentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;
}
