import { z } from 'zod';

export const createCertificateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  templateUrl: z.string().url().optional().or(z.literal('')),
  userId: z.string().uuid(),
  courseId: z.string().uuid(),
});

export type CreateCertificateInput = z.infer<typeof createCertificateSchema>;

export const updateCertificateSchema = createCertificateSchema.partial();

export type UpdateCertificateInput = z.infer<typeof updateCertificateSchema>;

export const certificateSchema = createCertificateSchema.extend({
  id: z.string().uuid(),
  issuedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Certificate = z.infer<typeof certificateSchema>;
