import { z } from 'zod';

export const createEnrollmentSchema = z.object({
  userId: z.string().uuid(),
  courseId: z.string().uuid(),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;

export const updateEnrollmentSchema = z.object({
  progress: z.number().min(0).max(100).optional(),
  completed: z.boolean().optional(),
});

export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;

export const enrollmentSchema = createEnrollmentSchema.extend({
  id: z.string().uuid(),
  progress: z.number().min(0).max(100),
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable(),
  enrolledAt: z.string().datetime(),
});

export type Enrollment = z.infer<typeof enrollmentSchema>;

const userSummarySchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().nullable(),
});

export const enrollmentWithUserSchema = enrollmentSchema.extend({
  user: userSummarySchema,
});

export type EnrollmentWithUser = z.infer<typeof enrollmentWithUserSchema>;
