import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
  categoryId: z.string().uuid().optional(),
  price: z.number().min(0).optional(),
  currency: z.string().optional(),
  estimatedDuration: z.number().int().min(0).optional(),
  certificateTemplateUrl: z.string().optional().nullable(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = createCourseSchema.partial().extend({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  isPublished: z.boolean().optional(),
});

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

export const courseSchema = createCourseSchema.extend({
  id: z.string().uuid(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  isPublished: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Course = z.infer<typeof courseSchema>;
