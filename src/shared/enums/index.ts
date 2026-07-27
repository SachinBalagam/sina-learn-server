export type UserRole = 'PLATFORM_SUPER_ADMIN' | 'ORGANIZATION_OWNER' | 'ORGANIZATION_ADMIN' | 'TRAINER' | 'TEACHING_ASSISTANT' | 'LEARNER';

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type LessonType = 'video' | 'article' | 'quiz' | 'meeting';

export type MediaStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export type QuizStatus = 'DRAFT' | 'PUBLISHED';

export type MeetingStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELED';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export type PaymentProvider = 'RAZORPAY' | 'STRIPE';

export type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING';

export type LiveSessionStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELED';
