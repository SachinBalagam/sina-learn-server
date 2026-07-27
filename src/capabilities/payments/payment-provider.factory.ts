import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RazorpayAdapter } from '../../common/providers/razorpay/razorpay.adapter';
import { PaymentProviderInterface } from '../../common/providers/payment-provider.interface';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getProvider(orgId: string): Promise<PaymentProviderInterface> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    const settings = org?.settings as any;
    const payments = settings?.payments;

    // Resolve tenant credentials if the Premium SaaS plan is active
    if (
      payments?.paymentType === 'standalone' &&
      payments?.razorpay?.keyId &&
      payments?.razorpay?.keySecret
    ) {
      return new RazorpayAdapter(this.configService, {
        keyId: payments.razorpay.keyId,
        keySecret: payments.razorpay.keySecret,
      });
    }

    // Fallback to platform central gateway settings
    return new RazorpayAdapter(this.configService);
  }
}
