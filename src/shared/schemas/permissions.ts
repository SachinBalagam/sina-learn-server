import { z } from 'zod';

export const permissionGroupSchema = z.object({
  capability: z.string(),
  label: z.string(),
  color: z.string(),
  permissions: z.array(z.object({
    key: z.string(),
    label: z.string(),
  })),
});

export type PermissionGroup = z.infer<typeof permissionGroupSchema>;

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    capability: 'learning',
    label: 'Learning',
    color: 'text-primary',
    permissions: [
      { key: 'courses:create', label: 'Create Courses' },
      { key: 'courses:read', label: 'View Courses' },
      { key: 'courses:update', label: 'Edit Courses' },
      { key: 'courses:delete', label: 'Delete Courses' },
      { key: 'courses:publish', label: 'Publish Courses' },
      { key: 'courses:enroll', label: 'Enroll in Courses' },
      { key: 'modules:create', label: 'Create Modules' },
      { key: 'modules:update', label: 'Edit Modules' },
      { key: 'modules:delete', label: 'Delete Modules' },
      { key: 'lessons:create', label: 'Create Lessons' },
      { key: 'lessons:update', label: 'Edit Lessons' },
      { key: 'lessons:delete', label: 'Delete Lessons' },
      { key: 'quizzes:create', label: 'Create Quizzes' },
      { key: 'quizzes:update', label: 'Edit Quizzes' },
      { key: 'quizzes:delete', label: 'Delete Quizzes' },
      { key: 'quizzes:attempt', label: 'Attempt Quizzes' },
    ],
  },
  {
    capability: 'org',
    label: 'Organization',
    color: 'text-amber-600',
    permissions: [
      { key: 'org:read', label: 'View Organization' },
      { key: 'org:update', label: 'Edit Organization' },
      { key: 'org:delete', label: 'Delete Organization' },
      { key: 'org:manage_users', label: 'Manage Users' },
      { key: 'org:manage_invites', label: 'Manage Invitations' },
      { key: 'org:manage_subscription', label: 'Manage Subscription' },
      { key: 'users:read', label: 'View Users' },
      { key: 'users:create', label: 'Create Users' },
      { key: 'users:update', label: 'Edit Users' },
      { key: 'users:delete', label: 'Delete Users' },
    ],
  },
  {
    capability: 'media',
    label: 'Media & Files',
    color: 'text-purple-600',
    permissions: [
      { key: 'media:upload', label: 'Upload Files' },
      { key: 'media:read', label: 'View Files' },
      { key: 'media:delete', label: 'Delete Files' },
    ],
  },
  {
    capability: 'analytics',
    label: 'Analytics',
    color: 'text-cyan-600',
    permissions: [
      { key: 'analytics:read', label: 'View Analytics' },
    ],
  },
  {
    capability: 'settings',
    label: 'Settings',
    color: 'text-slate-600',
    permissions: [
      { key: 'settings:read', label: 'View Settings' },
      { key: 'settings:update', label: 'Update Settings' },
    ],
  },
  {
    capability: 'audit',
    label: 'Audit',
    color: 'text-rose-600',
    permissions: [
      { key: 'audit:read', label: 'View Audit Logs' },
    ],
  },
  {
    capability: 'payments',
    label: 'Payments',
    color: 'text-emerald-600',
    permissions: [
      { key: 'payments:read', label: 'View Payments' },
      { key: 'payments:refund', label: 'Process Refunds' },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));
