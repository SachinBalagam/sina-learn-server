import { z } from 'zod';

export const authResponseSchema = z.object({
  message: z.string(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

export const organizationResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().optional(),
});

export type OrganizationResponse = z.infer<typeof organizationResponseSchema>;

export const mediaUploadResponseSchema = z.object({
  id: z.string().uuid(),
  providerKey: z.string(),
  originalName: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  thumbnailUrl: z.string().nullable().optional(),
});

export type MediaUploadResponse = z.infer<typeof mediaUploadResponseSchema>;

export const mediaItemSchema = mediaUploadResponseSchema.extend({
  createdAt: z.string().datetime(),
});

export type MediaItem = z.infer<typeof mediaItemSchema>;

export const lessonResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: z.string(),
  sortOrder: z.number(),
  duration: z.number().nullable(),
  isFree: z.boolean(),
  moduleId: z.string().uuid(),
  content: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type LessonResponse = z.infer<typeof lessonResponseSchema>;

export const moduleResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  sortOrder: z.number(),
  lessons: z.array(lessonResponseSchema),
});

export type ModuleResponse = z.infer<typeof moduleResponseSchema>;

export const courseDetailSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  price: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  estimatedDuration: z.number().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  certificateTemplateUrl: z.string().nullable().optional(),
  status: z.string(),
  isPublished: z.boolean(),
  modules: z.array(moduleResponseSchema),
  instructors: z.array(z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    user: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string(),
    }),
  })).optional(),
  _count: z.object({
    modules: z.number(),
    enrollments: z.number(),
  }),
});

export type CourseDetail = z.infer<typeof courseDetailSchema>;

export const courseCatalogItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  price: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  estimatedDuration: z.number().nullable(),
  category: z.object({ name: z.string() }).nullable(),
  createdBy: z.object({ firstName: z.string(), lastName: z.string() }),
  _count: z.object({ modules: z.number(), enrollments: z.number() }),
  enrollments: z.array(
    z.object({
      id: z.string().uuid(),
    })
  ).optional(),
});

export type CourseCatalogItem = z.infer<typeof courseCatalogItemSchema>;

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  });

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const courseListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  status: z.string(),
  isPublished: z.boolean(),
  createdAt: z.string().datetime(),
  category: z.object({ name: z.string() }).nullable().optional(),
  _count: z.object({ modules: z.number(), enrollments: z.number() }),
});

export type CourseListItem = z.infer<typeof courseListItemSchema>;

export const enrollmentResponseSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  userId: z.string().uuid(),
  progress: z.number(),
  completed: z.boolean(),
  course: z.object({
    id: z.string().uuid(),
    title: z.string(),
    slug: z.string().nullable().optional(),
    thumbnailUrl: z.string().nullable().optional(),
    estimatedDuration: z.number().nullable().optional(),
    category: z.object({ name: z.string() }).nullable().optional(),
    _count: z.object({ modules: z.number() }).optional(),
  }).optional(),
});

export type EnrollmentResponse = z.infer<typeof enrollmentResponseSchema>;

export const certificateItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  issuedAt: z.string().datetime(),
  courseId: z.string().uuid(),
  course: z.object({ title: z.string() }).optional(),
  organization: z.object({ name: z.string() }).optional(),
});

export type CertificateItem = z.infer<typeof certificateItemSchema>;

export const mailTemplateSchema = z.object({
  key: z.string(),
  subject: z.string(),
  htmlBody: z.string(),
  isEnabled: z.boolean(),
  isCustomized: z.boolean().optional(),
});

export type MailTemplate = z.infer<typeof mailTemplateSchema>;

export const userListItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
  roles: z.array(z.object({ id: z.string().uuid(), name: z.string() })).optional(),
  isActive: z.boolean(),
});

export type UserListItem = z.infer<typeof userListItemSchema>;

export const roleItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  permissions: z.array(z.string()),
});

export type RoleItem = z.infer<typeof roleItemSchema>;

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.string(),
  isActive: z.boolean(),
  organizationId: z.string().nullable(),
  organization: z.object({ id: z.string().uuid(), name: z.string(), slug: z.string(), logoUrl: z.string().nullable() }).nullable().optional(),
  permissions: z.array(z.string()),
  lastLoginAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const quizQuestionInputSchema = z.object({
  question: z.string(),
  type: z.string(),
  options: z.array(z.object({ label: z.string(), value: z.string() })),
  correctAnswerIndex: z.number().int(),
  points: z.number().int(),
});

export type QuizQuestionInput = z.infer<typeof quizQuestionInputSchema>;

export const quizQuestionResponseSchema = quizQuestionInputSchema.extend({
  id: z.string().uuid(),
  correctAnswerIndex: z.number().int().optional(),
});

export type QuizQuestionResponse = z.infer<typeof quizQuestionResponseSchema>;

export const quizAttemptSchema = z.object({
  id: z.string().uuid(),
  quiz: z.object({
    title: z.string(),
    passingScore: z.number(),
    questions: z.array(quizQuestionResponseSchema),
  }),
});

export type QuizAttempt = z.infer<typeof quizAttemptSchema>;

export const verifiedCertificateSchema = z.object({
  isValid: z.boolean().optional(),
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  issuedAt: z.string().datetime(),
  user: z.object({ firstName: z.string(), lastName: z.string() }),
  organization: z.object({ name: z.string() }),
});

export type VerifiedCertificate = z.infer<typeof verifiedCertificateSchema>;

export const orgDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  maxStorageGb: z.number(),
  _count: z.object({ courses: z.number(), users: z.number() }),
});

export type OrgDetail = z.infer<typeof orgDetailSchema>;

export const completedLessonSchema = z.object({
  lessonId: z.string().uuid(),
  completedAt: z.string().datetime(),
});

export type CompletedLesson = z.infer<typeof completedLessonSchema>;

export const liveSessionResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  courseId: z.string().uuid().nullable(),
  provider: z.string().nullable(),
  providerMeetingId: z.string().nullable(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable(),
  status: z.string(),
  joinUrl: z.string().nullable(),
  startUrl: z.string().nullable(),
  meetingPassword: z.string().nullable(),
  streamUrl: z.string().nullable(),
  hlsUrl: z.string().nullable(),
  recordingUrl: z.string().nullable(),
  playbackUrl: z.string().nullable(),
  course: z.object({ id: z.string().uuid(), title: z.string() }).nullable().optional(),
  createdBy: z.object({ id: z.string().uuid(), firstName: z.string(), lastName: z.string() }).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type LiveSessionResponse = z.infer<typeof liveSessionResponseSchema>;
