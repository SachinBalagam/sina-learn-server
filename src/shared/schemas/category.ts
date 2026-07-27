import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial().omit({ organizationId: true });

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categorySchema = createCategorySchema.extend({
  id: z.string().uuid(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Category = z.infer<typeof categorySchema>;
