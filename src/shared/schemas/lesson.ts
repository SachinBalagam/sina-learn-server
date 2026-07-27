import { z } from 'zod';

export const createLessonSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['video', 'article', 'quiz', 'meeting']).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  sortOrder: z.number().int().min(0).optional(),
  duration: z.number().int().min(0).optional(),
  isFree: z.boolean().optional(),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;

export const updateLessonSchema = createLessonSchema.partial();

export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;

export const lessonSchema = createLessonSchema.extend({
  id: z.string().uuid(),
  isFree: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});

export type Lesson = z.infer<typeof lessonSchema>;
