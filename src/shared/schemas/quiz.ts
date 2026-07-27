import { z } from 'zod';

export const quizQuestionSchema = z.object({
  type: z.string().optional(),
  question: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  points: z.number().int().min(0).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const createQuizSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  timeLimit: z.number().int().min(0).optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).optional(),
  lessonId: z.string().uuid().optional(),
  courseId: z.string().uuid(),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;

export const updateQuizSchema = createQuizSchema.partial().omit({ courseId: true });

export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;

export const quizSchema = createQuizSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Quiz = z.infer<typeof quizSchema>;
