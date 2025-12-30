export type Mood = 'focus' | 'chill' | 'sleep' | 'ambient';

export interface Track {
  id: string;
  mood: Mood;
  tags: string[];
  durationSec: number;
  prompt: string;
  filePath: string;
  createdAt: any;
}

export interface Session {
  id: string;
  uid: string | 'anon';
  mood: Mood;
  lastTrackIds: string[];
  likedTags?: string[];
  skippedTags?: string[];
  createdAt: any;
  updatedAt: any;
}

export interface UserEvent {
  id: string;
  uid: string;
  trackId: string;
  type: 'play' | 'like' | 'skip';
  sessionId?: string;
  createdAt: any;
}








