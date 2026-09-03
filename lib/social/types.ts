import type { Element } from '@/lib/game/types';

/**
 * الحساب كما تراه الواجهة. لا يحمل البريد إطلاقاً: البريد صوريّ مشتقّ من
 * اسم المستخدم (lib/auth/username.ts) ولا معنى لعرضه ولا لتسريبه.
 */
export interface Account {
  id: string;
  username: string;
  displayName: string;
  wins: number;
  losses: number;
  matchesPlayed: number;
  titanSummons: number;
  trapsSet: number;
  level: number;
  /** تاريخ التسجيل — ISO */
  createdAt: string;
}

/** ملف مختصر لصديق أو نتيجة بحث */
export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  level: number;
}

export type FriendStatus = 'pending' | 'accepted' | 'blocked';

/**
 * حافة صداقة كما تُعرض. الصفّ في القاعدة اتجاهيّ (طالب ← مطلوب)، و`direction`
 * تقول أين يقف صاحب الجلسة منه: هو أرسل الطلب أم استقبله.
 */
export interface FriendEdge {
  id: string;
  status: FriendStatus;
  direction: 'outgoing' | 'incoming';
  profile: PublicProfile;
  createdAt: string;
}

export interface DirectMessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface GameInvite {
  id: string;
  fromUser: string;
  toUser: string;
  roomCode: string;
  playerCount: 2 | 3;
  turnSeconds: number;
  seatsTaken: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: string;
  expiresAt: string;
  /** اسم المُرسِل — يُضمّ عند القراءة لعرضه في الإشعار */
  fromName?: string;
}

export interface MatchRecordRow {
  id: string;
  match_id: string;
  mode: 'ai' | 'online';
  seat: number;
  player_count: number;
  result: 'win' | 'loss';
  turns: number;
  hp_left: number;
  reason: string | null;
  difficulty: string | null;
  opponents: string[];
  created_at: string;
}

export interface TopCard {
  cardDefId: string;
  element: Element;
  plays: number;
}

export interface TopElement {
  element: Element;
  plays: number;
}
