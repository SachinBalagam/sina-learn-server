import { Injectable, Inject, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaymentProviderInterface } from '../../common/providers/payment-provider.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { PaymentStatus, PaymentProvider } from '@prisma/client';
import { PaymentProviderFactory } from './payment-provider.factory';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private paymentFactory: PaymentProviderFactory,
  ) {}

  async createOrder(userId: string, orgId: string, dto: CreateOrderDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, organizationId: orgId, deletedAt: null },
    });

    if (!course) {
      throw new NotFoundException({ code: 'COURSE_NOT_FOUND', message: 'Course not found' });
    }

    if (!course.price || course.price === 0) {
      throw new BadRequestException({ code: 'COURSE_IS_FREE', message: 'This course is free. Enroll directly.' });
    }

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    });

    if (existingEnrollment) {
      throw new BadRequestException({ code: 'ALREADY_ENROLLED', message: 'Already enrolled in this course' });
    }

    const receipt = `receipt_${orgId.slice(0, 8)}_${Date.now()}`;

    const paymentProvider = await this.paymentFactory.getProvider(orgId);

    const order = await paymentProvider.createOrder({
      amount: course.price,
      currency: dto.currency || course.currency || 'INR',
      receipt,
      notes: { userId, courseId: course.id, orgId },
    });

    const payment = await this.prisma.payment.create({
      data: {
        organizationId: orgId,
        userId,
        courseId: course.id,
        amount: course.price,
        currency: dto.currency || course.currency || 'INR',
        status: 'PENDING' as PaymentStatus,
        provider: 'RAZORPAY' as PaymentProvider,
        providerOrderId: order.id,
        metadata: { receipt },
      },
    });

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });
    const settings = org?.settings as any;
    const clientKey = (settings?.payments?.paymentType === 'standalone' && settings?.payments?.razorpay?.keyId)
      ? settings.payments.razorpay.keyId
      : (process.env.RAZORPAY_KEY_ID || '');

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment.id,
      key: clientKey,
    };
  }

  async verifyPayment(userId: string, orgId: string, dto: VerifyPaymentDto) {
    const paymentProvider = await this.paymentFactory.getProvider(orgId);
    const verification = await paymentProvider.verifyPayment({
      orderId: dto.razorpay_order_id,
      paymentId: dto.razorpay_payment_id,
      signature: dto.razorpay_signature,
    });

    if (!verification.verified) {
      throw new BadRequestException({ code: 'PAYMENT_VERIFICATION_FAILED', message: 'Payment verification failed' });
    }

    // Backend-Side Shield: Reject international credit cards for domestic transactions
    try {
      const paymentDetails = await paymentProvider.getPayment(dto.razorpay_payment_id);
      if (paymentDetails.currency === 'INR' && paymentDetails.method === 'card') {
        const rawPayment = await (paymentProvider as any).razorpay.payments.fetch(dto.razorpay_payment_id);
        const cardCountry = rawPayment.card?.country;
        if (cardCountry && cardCountry !== 'IN') {
          throw new BadRequestException({
            code: 'REGIONAL_PAYMENT_MISMATCH',
            message: 'International cards are not permitted for domestic currency transactions.',
          });
        }
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn('Could not verify card country origin', err);
    }

    const payment = await this.prisma.payment.findFirst({
      where: { providerOrderId: dto.razorpay_order_id },
      include: { course: { select: { id: true, title: true } } },
    });

    if (!payment) {
      throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Payment record not found' });
    }

    if (payment.status === 'SUCCESS') {
      return { success: true, alreadyProcessed: true };
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS' as PaymentStatus,
        providerPaymentId: dto.razorpay_payment_id,
        providerSignature: dto.razorpay_signature,
      },
    });

    const enrollment = await this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId: payment.courseId! } },
      update: {},
      create: {
        userId,
        courseId: payment.courseId!,
        progress: 0,
        completed: false,
      },
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { enrollmentId: enrollment.id },
    });

    return { success: true, payment: updatedPayment, enrollment };
  }

  async findAll(orgId: string, query: QueryPaymentDto) {
    const where: any = { organizationId: orgId };
    if (query.status) where.status = query.status;

    const skip = ((query.page || 1) - 1) * (query.limit || 20);

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: query.limit || 20,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          course: { select: { id: true, title: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, page: query.page || 1, limit: query.limit || 20 };
  }

  async findMyPayments(userId: string, orgId: string) {
    return this.prisma.payment.findMany({
      where: { userId, organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      include: { course: { select: { id: true, title: true, thumbnailUrl: true } } },
    });
  }

  async findOne(id: string, orgId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, organizationId: orgId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' });
    }

    return payment;
  }

  async refund(id: string, orgId: string, amount?: number) {
    const payment = await this.findOne(id, orgId);

    if (payment.status !== 'SUCCESS') {
      throw new BadRequestException({ code: 'PAYMENT_NOT_SUCCESS', message: 'Can only refund successful payments' });
    }

    if (!payment.providerPaymentId) {
      throw new BadRequestException({ code: 'NO_PROVIDER_PAYMENT', message: 'No provider payment ID' });
    }

    const paymentProvider = await this.paymentFactory.getProvider(orgId);
    const refund = await paymentProvider.processRefund(payment.providerPaymentId, amount);

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED' as PaymentStatus,
        refundId: refund.id,
        refundAmount: refund.amount,
      },
    });
  }

  async handleWebhook(body: any, signature: string) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex');

      if (expectedSignature !== signature) {
        this.logger.warn('Webhook signature mismatch');
        return { received: true, ignored: true };
      }
    }

    const event = body.event;
    const payload = body.payload;

    if (event === 'payment.captured' && payload?.payment?.entity) {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id;

      const payment = await this.prisma.payment.findFirst({
        where: { providerOrderId: orderId },
      });

      if (payment && payment.status === 'PENDING') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS' as PaymentStatus,
            providerPaymentId: paymentEntity.id,
          },
        });
        this.logger.log(`Payment ${paymentEntity.id} captured via webhook`);
      }
    }

    if (event === 'payment.failed' && payload?.payment?.entity) {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id;

      await this.prisma.payment.updateMany({
        where: { providerOrderId: orderId, status: 'PENDING' },
        data: { status: 'FAILED' as PaymentStatus },
      });
    }

    return { received: true };
  }
}
