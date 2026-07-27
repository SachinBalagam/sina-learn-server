import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1),
  logoUrl: z.string().url().optional().or(z.literal('')),
  domain: z.string().optional(),
  maxUsers: z.number().int().min(1).optional(),
  maxStorageGb: z.number().int().min(1).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = createOrganizationSchema.partial();

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const organizationSchema = createOrganizationSchema.extend({
  id: z.string().uuid(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Organization = z.infer<typeof organizationSchema>;
