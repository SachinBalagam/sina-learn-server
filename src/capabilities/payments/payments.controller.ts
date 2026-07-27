import { Controller, Get, Post, Body, Param, Query, Req, Headers, ParseUUIDPipe } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/permissions/require-permission.decorator';
import { Permissions } from '../../common/permissions/permission.registry';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create-order')
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.paymentsService.createOrder(userId, orgId, dto);
  }

  @Post('verify')
  async verifyPayment(
    @Body() dto: VerifyPaymentDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.paymentsService.verifyPayment(userId, orgId, dto);
  }

  @Get()
  @RequirePermission(Permissions.PAYMENTS_READ)
  async findAll(
    @Query() query: QueryPaymentDto,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.paymentsService.findAll(orgId, query);
  }

  @Get('my')
  async findMyPayments(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.paymentsService.findMyPayments(userId, orgId);
  }

  @Get(':id')
  @RequirePermission(Permissions.PAYMENTS_READ)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.paymentsService.findOne(id, orgId);
  }

  @Post(':id/refund')
  @RequirePermission(Permissions.PAYMENTS_REFUND)
  async refund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundPaymentDto,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.paymentsService.refund(id, orgId, dto.amount);
  }

  @Post('webhook')
  async handleWebhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(body, signature);
  }
}
