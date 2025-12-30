export type Mood = 'focus' | 'chill' | 'sleep' | 'ambient';

export interface Track {
  id: string;
  mood: Mood;
  tags: string[];
  durationSec: number;
}




