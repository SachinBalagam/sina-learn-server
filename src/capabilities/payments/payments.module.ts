import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentProviderFactory } from './payment-provider.factory';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentProviderFactory],
  exports: [PaymentsService, PaymentProviderFactory],
})
export class PaymentsModule {}
