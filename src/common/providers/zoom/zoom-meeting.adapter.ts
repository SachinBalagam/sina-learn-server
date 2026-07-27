import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeetingProviderInterface, CreateMeetingOptions, CreateMeetingResult } from '../meeting-provider.interface';

@Injectable()
export class ZoomMeetingAdapter implements MeetingProviderInterface {
  private readonly logger = new Logger(ZoomMeetingAdapter.name);
  private readonly baseUrl = 'https://api.zoom.us/v2';
  private readonly authUrl = 'https://zoom.us/oauth/token';
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private configService: ConfigService) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const accountId = this.configService.get<string>('ZOOM_ACCOUNT_ID');
    const clientId = this.configService.get<string>('ZOOM_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ZOOM_CLIENT_SECRET');

    if (!accountId || !clientId || !clientSecret) {
      throw new Error('Zoom is not configured. Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET.');
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(`${this.authUrl}?grant_type=account_credentials&account_id=${accountId}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zoom auth failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken!;
  }

  private async request(path: string, options: { method?: string; body?: any } = {}) {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zoom API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async createMeeting(options: CreateMeetingOptions): Promise<CreateMeetingResult> {
    const startTimeISO = options.startTime instanceof Date
      ? options.startTime.toISOString()
      : new Date(options.startTime).toISOString();

    const body = {
      topic: options.title,
      type: 2,
      start_time: startTimeISO,
      duration: options.durationMinutes || 40,
      timezone: 'UTC',
      agenda: options.description || '',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: true,
        waiting_room: false,
      },
    };

    const data = await this.request('/users/me/meetings', { method: 'POST', body });

    return {
      provider: 'zoom',
      providerMeetingId: String(data.id),
      joinUrl: data.join_url,
      startUrl: data.start_url,
      password: data.password,
    };
  }

  async getMeeting(providerMeetingId: string): Promise<{ joinUrl: string; status: string }> {
    const data = await this.request(`/meetings/${providerMeetingId}`);
    return {
      joinUrl: data.join_url,
      status: data.status,
    };
  }

  async endMeeting(providerMeetingId: string): Promise<void> {
    await this.request(`/meetings/${providerMeetingId}/status`, {
      method: 'PUT',
      body: { action: 'end' },
    });
  }

  async getRecordings(providerMeetingId: string): Promise<{ url: string; status: string }[]> {
    try {
      const data = await this.request(`/meetings/${providerMeetingId}/recordings`);
      if (!data.recording_files || data.recording_files.length === 0) {
        return [];
      }
      return data.recording_files
        .filter((f: any) => f.file_type === 'MP4')
        .map((f: any) => ({
          url: f.play_url || f.download_url,
          status: f.status,
        }));
    } catch {
      return [];
    }
  }
}
