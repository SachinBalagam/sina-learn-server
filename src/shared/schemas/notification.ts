import { z } from 'zod';

export const notificationSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  data: z.record(z.string(), z.unknown()).nullable(),
  actorId: z.string().nullable(),
  actionUrl: z.string().nullable(),
  organizationId: z.string().uuid(),
  userId: z.string().nullable(),
  createdAt: z.string().datetime(),
  isRead: z.boolean(),
});

export type Notification = z.infer<typeof notificationSchema>;
