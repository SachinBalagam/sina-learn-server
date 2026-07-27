export interface CreateMeetingOptions {
  title: string;
  description?: string;
  startTime: Date;
  durationMinutes?: number;
}

export interface CreateMeetingResult {
  provider: string;
  providerMeetingId: string;
  joinUrl: string;
  startUrl?: string;
  password?: string;
}

export interface MeetingProviderInterface {
  createMeeting(options: CreateMeetingOptions): Promise<CreateMeetingResult>;

  getMeeting(providerMeetingId: string): Promise<{
    joinUrl: string;
    status: string;
  }>;

  endMeeting(providerMeetingId: string): Promise<void>;

  getRecordings?(providerMeetingId: string): Promise<{
    url: string;
    status: string;
  }[]>;
}
