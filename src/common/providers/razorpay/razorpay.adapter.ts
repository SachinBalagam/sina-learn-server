import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import {
  PaymentProviderInterface,
  CreateOrderOptions,
  CreateOrderResult,
  VerifyPaymentOptions,
  VerifyPaymentResult,
  PaymentDetails,
  RefundResult,
} from '../payment-provider.interface';

@Injectable()
export class RazorpayAdapter implements PaymentProviderInterface {
  private readonly logger = new Logger(RazorpayAdapter.name);
  private razorpay: Razorpay;
  private readonly keySecret: string;

  constructor(
    configService: ConfigService,
    @Optional() overrides?: { keyId: string; keySecret: string }
  ) {
    const keyId = overrides?.keyId || configService.get<string>('RAZORPAY_KEY_ID', 'rzp_test_placeholder');
    this.keySecret = overrides?.keySecret || configService.get<string>('RAZORPAY_KEY_SECRET', 'placeholder');
    if (keyId === 'rzp_test_placeholder' && !overrides) {
      this.logger.warn('RAZORPAY_KEY_ID not configured — using placeholder key. Payments will fail in production.');
    }
    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: this.keySecret,
    });
  }

  async createOrder(options: CreateOrderOptions): Promise<CreateOrderResult> {
    const order = await this.razorpay.orders.create({
      amount: options.amount,
      currency: options.currency,
      receipt: options.receipt,
      notes: options.notes as Record<string, string | number> | undefined,
    });
    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      status: order.status,
      receipt: order.receipt,
    };
  }

  async verifyPayment(options: VerifyPaymentOptions): Promise<VerifyPaymentResult> {
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${options.orderId}|${options.paymentId}`)
      .digest('hex');
    return { verified: expectedSignature === options.signature };
  }

  async getPayment(paymentId: string): Promise<PaymentDetails> {
    const payment = await this.razorpay.payments.fetch(paymentId);
    return {
      id: payment.id,
      orderId: payment.order_id,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      email: payment.email ? String(payment.email) : undefined,
      contact: payment.contact ? String(payment.contact) : undefined,
      fee: payment.fee ? Number(payment.fee) : undefined,
      tax: payment.tax ? Number(payment.tax) : undefined,
      createdAt: payment.created_at,
    };
  }

  async processRefund(paymentId: string, amount?: number): Promise<RefundResult> {
    const refund = await this.razorpay.payments.refund(paymentId, {
      ...(amount !== undefined ? { amount } : {}),
    });
    return {
      id: refund.id,
      paymentId: refund.payment_id,
      amount: refund.amount ?? 0,
      status: refund.status,
      createdAt: refund.created_at,
    };
  }
}
