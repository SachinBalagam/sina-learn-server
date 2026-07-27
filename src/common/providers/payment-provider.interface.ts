export interface CreateOrderOptions {
  amount: number;
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string;
}

export interface VerifyPaymentOptions {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface VerifyPaymentResult {
  verified: boolean;
}

export interface PaymentDetails {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  email?: string;
  contact?: string;
  fee?: number;
  tax?: number;
  createdAt: number;
}

export interface RefundResult {
  id: string;
  paymentId: string;
  amount: number;
  status: string;
  createdAt: number;
}

export interface PaymentProviderInterface {
  createOrder(options: CreateOrderOptions): Promise<CreateOrderResult>;
  verifyPayment(options: VerifyPaymentOptions): Promise<VerifyPaymentResult>;
  getPayment(paymentId: string): Promise<PaymentDetails>;
  processRefund(paymentId: string, amount?: number): Promise<RefundResult>;
}
