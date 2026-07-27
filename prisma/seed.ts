import { PrismaClient, UserRole, CourseStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Cleaning database...');
  
  // Clean tables to ensure a fresh, clean reset
  await prisma.completedLesson.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.courseModule.deleteMany();
  await prisma.courseInstructor.deleteMany();
  await prisma.course.deleteMany();
  await prisma.category.deleteMany();
  await prisma.role.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.notificationRead.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.media.deleteMany();
  await prisma.mailTemplate.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subscriptionPlan.deleteMany();

  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('Admin@123', 12);

  // 1. Subscription Plans
  const plans = [
    { name: 'Starter', slug: 'starter', priceMonth: 0, priceYear: 0, maxUsers: 10, maxStorageGb: 5, features: { maxCourses: 5, analytics: false, customDomain: false, apiAccess: false } },
    { name: 'Growth', slug: 'growth', priceMonth: 2999, priceYear: 29990, maxUsers: 50, maxStorageGb: 50, features: { maxCourses: 50, analytics: true, customDomain: false, apiAccess: false } },
    { name: 'Enterprise', slug: 'enterprise', priceMonth: 9999, priceYear: 99990, maxUsers: 500, maxStorageGb: 500, features: { maxCourses: 500, analytics: true, customDomain: true, apiAccess: true } },
  ];
  for (const plan of plans) {
    await prisma.subscriptionPlan.create({ data: plan });
  }
  const growthPlan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { slug: 'growth' } });

  // 2. Platform Super Admin (resides outside organizations)
  const superAdmin = await prisma.user.create({
    data: {
      email: 'sinalearn@gmail.com',
      passwordHash,
      firstName: 'Platform',
      lastName: 'Superadmin',
      role: 'PLATFORM_SUPER_ADMIN',
    },
  });

  // 3. Create Owner User (temporary without organizationId)
  const owner = await prisma.user.create({
    data: {
      email: 'owner@sinalearn.com',
      passwordHash,
      firstName: 'Sina',
      lastName: 'Owner',
      role: 'ORGANIZATION_OWNER',
    },
  });

  // 4. Organization (owned by owner.id)
  const org = await prisma.organization.create({
    data: {
      name: 'Sina Learn Corporate',
      slug: 'sinalearn',
      domain: 'sinalearn.com',
      ownerId: owner.id,
      maxUsers: 100,
      maxStorageGb: 100,
      settings: { timezone: 'Asia/Kolkata', locale: 'en-US' },
    },
  });

  // Create Active Subscription for organization
  await prisma.subscription.create({
    data: {
      planId: growthPlan.id,
      organizationId: org.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // 5. Custom Roles in Organization
  const roleData = [
    {
      name: 'Owner',
      description: 'Full administrative ownership access to all modules, billing, and configurations.',
      permissions: [
        'org:read', 'org:update', 'org:delete', 'org:manage_users', 'org:manage_invites', 'org:manage_subscription',
        'users:read', 'users:create', 'users:update', 'users:delete',
        'courses:read', 'courses:create', 'courses:update', 'courses:delete', 'courses:publish', 'courses:enroll',
        'modules:create', 'modules:update', 'modules:delete',
        'lessons:create', 'lessons:update', 'lessons:delete',
        'media:upload', 'media:read', 'media:delete',
        'quizzes:create', 'quizzes:update', 'quizzes:delete', 'quizzes:attempt',
        'settings:read', 'settings:update', 'analytics:read', 'audit:read', 'payments:read', 'payments:refund'
      ]
    },
    {
      name: 'Administrator',
      description: 'Operations manager access. Manage courses, invites, reports, settings, and modules.',
      permissions: [
        'org:read', 'org:manage_users', 'org:manage_invites',
        'users:read', 'users:create', 'users:update',
        'courses:read', 'courses:create', 'courses:update', 'courses:delete', 'courses:publish',
        'modules:create', 'modules:update', 'modules:delete',
        'lessons:create', 'lessons:update', 'lessons:delete',
        'media:upload', 'media:read', 'media:delete',
        'quizzes:create', 'quizzes:update', 'quizzes:delete',
        'settings:read', 'settings:update', 'analytics:read', 'audit:read', 'payments:read'
      ]
    },
    {
      name: 'Trainer',
      description: 'Curriculum creator. Construct lectures, edit assignments, upload files, and grade quiz drafts.',
      permissions: [
        'org:read', 'users:read',
        'courses:read', 'courses:create', 'courses:update',
        'modules:create', 'modules:update', 'modules:delete',
        'lessons:create', 'lessons:update', 'lessons:delete',
        'media:upload', 'media:read',
        'quizzes:create', 'quizzes:update', 'quizzes:delete', 'quizzes:attempt',
        'courses:enroll'
      ]
    },
    {
      name: 'Teaching Assistant',
      description: 'Classroom moderator. Review lectures, moderate comments, and view directories.',
      permissions: [
        'org:read', 'users:read',
        'courses:read',
        'lessons:update',
        'media:read',
        'quizzes:attempt',
        'courses:enroll'
      ]
    },
    {
      name: 'Learner',
      description: 'End consumer. Enroll in lectures, take quizzes, watch videos, and get certificates.',
      permissions: [
        'org:read',
        'courses:read',
        'courses:enroll',
        'quizzes:attempt'
      ]
    }
  ];

  for (const r of roleData) {
    await prisma.role.create({ data: { ...r, organizationId: org.id } });
  }

  const ownerRole = await prisma.role.findFirstOrThrow({ where: { name: 'Owner', organizationId: org.id } });
  const adminRole = await prisma.role.findFirstOrThrow({ where: { name: 'Administrator', organizationId: org.id } });
  const trainerRole = await prisma.role.findFirstOrThrow({ where: { name: 'Trainer', organizationId: org.id } });
  const learnerRole = await prisma.role.findFirstOrThrow({ where: { name: 'Learner', organizationId: org.id } });

  // Update Owner with organizationId & Owner role reference
  await prisma.user.update({
    where: { id: owner.id },
    data: { 
      organizationId: org.id,
      roles: { connect: [{ id: ownerRole.id }] }
    },
  });

  // 6. Users (Owner already updated above)

  // One Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@sinalearn.com',
      passwordHash,
      firstName: 'Sina',
      lastName: 'Admin',
      role: 'ORGANIZATION_ADMIN',
      roles: { connect: [{ id: adminRole.id }] },
      organizationId: org.id,
    },
  });

  // One Trainer / Instructor (assigned to courses)
  const trainer = await prisma.user.create({
    data: {
      email: 'trainer@sinalearn.com',
      passwordHash,
      firstName: 'Sina',
      lastName: 'Trainer',
      role: 'TRAINER',
      roles: { connect: [{ id: trainerRole.id }] },
      organizationId: org.id,
    },
  });

  // Learners
  const learnerAlice = await prisma.user.create({
    data: {
      email: 'alice@sinalearn.com',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Learner',
      role: 'LEARNER',
      roles: { connect: [{ id: learnerRole.id }] },
      organizationId: org.id,
    },
  });

  const learnerBob = await prisma.user.create({
    data: {
      email: 'bob@sinalearn.com',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Learner',
      role: 'LEARNER',
      roles: { connect: [{ id: learnerRole.id }] },
      organizationId: org.id,
    },
  });

  // 6. Categories
  const categories = [
    { name: 'Web Development', slug: 'web-development', description: 'Modern Javascript and framework development', organizationId: org.id },
    { name: 'Backend Engineering', slug: 'backend-engineering', description: 'Database design, APIs, microservices', organizationId: org.id },
    { name: 'Design & UI/UX', slug: 'design-ui-ux', description: 'Wireframing, typography, color palettes', organizationId: org.id },
  ];
  for (const cat of categories) {
    await prisma.category.create({ data: cat });
  }
  const webCat = await prisma.category.findFirstOrThrow({ where: { slug: 'web-development', organizationId: org.id } });
  const backendCat = await prisma.category.findFirstOrThrow({ where: { slug: 'backend-engineering', organizationId: org.id } });
  const designCat = await prisma.category.findFirstOrThrow({ where: { slug: 'design-ui-ux', organizationId: org.id } });

  // 7. Course Configurations (3-4 courses)
  const courseData = [
    {
      title: 'Introduction to Next.js 15',
      slug: 'intro-nextjs-15',
      description: 'Master the next generation of Next.js including App Router, Server Components, and advanced layout structures.',
      price: 0,
      status: 'PUBLISHED' as CourseStatus,
      isPublished: true,
      publishedAt: new Date(),
      categoryId: webCat.id,
      estimatedDuration: 1200,
    },
    {
      title: 'NestJS Backend Architecture',
      slug: 'nestjs-backend-architecture',
      description: 'Learn enterprise-grade NestJS backend construction with controllers, modules, dependency injection, and Prisma integration.',
      price: 2999,
      status: 'PUBLISHED' as CourseStatus,
      isPublished: true,
      publishedAt: new Date(),
      categoryId: backendCat.id,
      estimatedDuration: 1800,
    },
    {
      title: 'Advanced Tailwind CSS & UI Design',
      slug: 'advanced-tailwind-ui',
      description: 'Dive deep into responsive layouts, micro-animations, theme customization, and utility-first styling with Tailwind CSS.',
      price: 1499,
      status: 'PUBLISHED' as CourseStatus,
      isPublished: true,
      publishedAt: new Date(),
      categoryId: designCat.id,
      estimatedDuration: 900,
    },
    {
      title: 'PostgreSQL Database Design & Optimization',
      slug: 'postgres-design-optimization',
      description: 'Comprehensive guide to building normalized database schemas, index types, performance tuning, and raw query optimization.',
      price: 3999,
      status: 'DRAFT' as CourseStatus,
      isPublished: false,
      publishedAt: null,
      categoryId: backendCat.id,
      estimatedDuration: 1500,
    },
  ];

  const courses: Record<string, any> = {};
  for (const c of courseData) {
    courses[c.title] = await prisma.course.create({
      data: {
        ...c,
        currency: 'INR',
        organizationId: org.id,
        createdById: trainer.id,
        instructors: { create: { userId: trainer.id } },
      },
    });
  }

  // 8. Modules & Lessons for Courses
  // React / Next Course modules
  const nextCourse = courses['Introduction to Next.js 15'];
  const nextMod1 = await prisma.courseModule.create({ data: { title: 'Getting Started with App Router', sortOrder: 0, courseId: nextCourse.id } });
  const nextMod2 = await prisma.courseModule.create({ data: { title: 'Data Fetching & Server Actions', sortOrder: 1, courseId: nextCourse.id } });

  await prisma.lesson.createMany({
    data: [
      { title: 'Welcome to Next.js 15', type: 'video', content: { videoUrl: 'https://example.com/intro.mp4' }, sortOrder: 0, duration: 300, moduleId: nextMod1.id, courseId: nextCourse.id },
      { title: 'Project Structure Setup', type: 'text', content: { body: 'In this lesson we explore the src folder structures.' }, sortOrder: 1, duration: 600, moduleId: nextMod1.id, courseId: nextCourse.id },
      { title: 'Layouts vs Templates', type: 'video', content: { videoUrl: 'https://example.com/layouts.mp4' }, sortOrder: 0, duration: 450, moduleId: nextMod2.id, courseId: nextCourse.id },
    ],
  });

  // NestJS Course modules
  const nestCourse = courses['NestJS Backend Architecture'];
  const nestMod1 = await prisma.courseModule.create({ data: { title: 'Introduction to NestJS Core', sortOrder: 0, courseId: nestCourse.id } });
  const nestMod2 = await prisma.courseModule.create({ data: { title: 'Prisma Integration', sortOrder: 1, courseId: nestCourse.id } });

  await prisma.lesson.createMany({
    data: [
      { title: 'What is NestJS Modules?', type: 'video', content: { videoUrl: 'https://example.com/nest-modules.mp4' }, sortOrder: 0, duration: 400, moduleId: nestMod1.id, courseId: nestCourse.id },
      { title: 'Controllers and Route Routing', type: 'text', content: { body: 'Learn how request handling routes to controllers.' }, sortOrder: 1, duration: 500, moduleId: nestMod1.id, courseId: nestCourse.id },
      { title: 'Prisma client connection', type: 'video', content: { videoUrl: 'https://example.com/nest-prisma.mp4' }, sortOrder: 0, duration: 600, moduleId: nestMod2.id, courseId: nestCourse.id },
    ],
  });

  // Tailwind Course Modules
  const tailwindCourse = courses['Advanced Tailwind CSS & UI Design'];
  const tailMod1 = await prisma.courseModule.create({ data: { title: 'Aesthetic Design Tokens', sortOrder: 0, courseId: tailwindCourse.id } });
  await prisma.lesson.create({
    data: { title: 'Utility-first vs Semantic classes', type: 'text', content: { body: 'Understand design tokens and utility bindings.' }, sortOrder: 0, duration: 400, moduleId: tailMod1.id, courseId: tailwindCourse.id },
  });

  // 9. Quizzes
  // NextJS Quiz
  const nextFirstLesson = await prisma.lesson.findFirstOrThrow({ where: { courseId: nextCourse.id } });
  const nextQuiz = await prisma.quiz.create({
    data: {
      title: 'Next.js 15 Starter Assessment',
      description: 'Test your understanding of Next.js 15 App router concepts.',
      status: 'PUBLISHED',
      passingScore: 60,
      maxAttempts: 3,
      lessonId: nextFirstLesson.id,
      courseId: nextCourse.id,
      organizationId: org.id,
      createdById: trainer.id,
    },
  });

  await prisma.quizQuestion.createMany({
    data: [
      {
        quizId: nextQuiz.id,
        type: 'multiple_choice',
        question: 'Which directory is used for route pages in Next.js 15 App Router?',
        options: [{ label: '/pages', value: '/pages' }, { label: '/app', value: '/app' }, { label: '/routes', value: '/routes' }, { label: '/src', value: '/src' }],
        correctAnswer: '/app',
        points: 5,
        sortOrder: 0,
      },
      {
        quizId: nextQuiz.id,
        type: 'multiple_choice',
        question: 'Are components inside the app router Server Components by default?',
        options: [{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }],
        correctAnswer: 'Yes',
        points: 5,
        sortOrder: 1,
      },
    ],
  });

  // NestJS Quiz
  const nestFirstLesson = await prisma.lesson.findFirstOrThrow({ where: { courseId: nestCourse.id } });
  const nestQuiz = await prisma.quiz.create({
    data: {
      title: 'NestJS Fundamentals Quiz',
      description: 'Check your backend integration knowledge.',
      status: 'PUBLISHED',
      passingScore: 70,
      maxAttempts: 3,
      lessonId: nestFirstLesson.id,
      courseId: nestCourse.id,
      organizationId: org.id,
      createdById: trainer.id,
    },
  });

  await prisma.quizQuestion.createMany({
    data: [
      {
        quizId: nestQuiz.id,
        type: 'multiple_choice',
        question: 'Which decorator registers a class as an injectable provider in NestJS?',
        options: [{ label: '@Injectable()', value: '@Injectable()' }, { label: '@Service()', value: '@Service()' }, { label: '@Provider()', value: '@Provider()' }],
        correctAnswer: '@Injectable()',
        points: 5,
        sortOrder: 0,
      },
    ],
  });

  // 10. Enrollments
  await prisma.enrollment.createMany({
    data: [
      { userId: learnerAlice.id, courseId: nextCourse.id },
      { userId: learnerAlice.id, courseId: nestCourse.id },
      { userId: learnerBob.id, courseId: nextCourse.id },
    ],
  });

  console.log('\n✅ Database reset and seed successfully completed!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Super Admin : sinalearn@gmail.com / Admin@123');
  console.log('   Org Owner   : owner@sinalearn.com / Admin@123');
  console.log('   Org Admin   : admin@sinalearn.com / Admin@123');
  console.log('   Trainer     : trainer@sinalearn.com / Admin@123');
  console.log('   Learner     : alice@sinalearn.com / Admin@123');
  console.log('   Learner     : bob@sinalearn.com / Admin@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
