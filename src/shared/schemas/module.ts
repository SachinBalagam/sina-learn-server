import { z } from 'zod';

export const createModuleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  sortOrder: z.number().int().min(0).optional(),
  courseId: z.string().uuid(),
});

export type CreateModuleInput = z.infer<typeof createModuleSchema>;

export const updateModuleSchema = createModuleSchema.partial().omit({ courseId: true });

export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;

export const moduleSchema = createModuleSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Module = z.infer<typeof moduleSchema>;
