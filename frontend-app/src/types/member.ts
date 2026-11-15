export interface Member {
  id: number;
  member_id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  tier: 'basic' | 'silver' | 'gold' | 'platinum';
  active: number;
  created_at?: string;
}

