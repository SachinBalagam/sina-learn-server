import { z } from 'zod';

const liveSessionStatusValues = ['SCHEDULED', 'LIVE', 'ENDED', 'CANCELED'] as const;
export const liveSessionStatusEnum = z.enum(liveSessionStatusValues);

export const liveSessionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  courseId: z.string().uuid().nullable(),
  provider: z.string().nullable(),
  providerMeetingId: z.string().nullable(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable(),
  status: liveSessionStatusEnum,
  joinUrl: z.string().nullable(),
  startUrl: z.string().nullable(),
  meetingPassword: z.string().nullable(),
  streamKey: z.string().nullable(),
  streamUrl: z.string().nullable(),
  playbackUrl: z.string().nullable(),
  hlsUrl: z.string().nullable(),
  recordingUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createLiveSessionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  courseId: z.string().uuid().optional(),
  startTime: z.string().datetime({ message: 'Invalid start time' }),
  endTime: z.string().datetime().optional(),
});

export const updateLiveSessionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  status: liveSessionStatusEnum.optional(),
  provider: z.string().optional(),
  joinUrl: z.string().optional(),
  startUrl: z.string().optional(),
  meetingPassword: z.string().optional(),
  streamKey: z.string().optional(),
  streamUrl: z.string().optional(),
  playbackUrl: z.string().optional(),
  hlsUrl: z.string().optional(),
  recordingUrl: z.string().optional(),
});
