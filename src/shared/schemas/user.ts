import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  organizationId: z.string().uuid().optional(),
  role: z.enum(['PLATFORM_SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'TRAINER', 'TEACHING_ASSISTANT', 'LEARNER']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userSchema = createUserSchema.extend({
  id: z.string().uuid(),
  isActive: z.boolean(),
  avatarUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  avatarUrl: z.string().nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
