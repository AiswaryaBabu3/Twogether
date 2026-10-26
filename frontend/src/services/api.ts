export interface Partner {
  id: number;
  couple_id: number;
  name: string;
  city: string;
  gender?: string | null;
  age?: number | null;
  dob?: string | null;
  timezone: string;
  status_message: string;
  status_emoji: string;
  avatar_url: string;
  is_online: boolean;
  latitude: number;
  longitude: number;
}

export interface DailyPrompt {
  id: number;
  question: string;
  user1_answered: boolean;
  user2_answered: boolean;
  user1_answer: string | null;
  user2_answer: string | null;
  is_revealed: boolean;
}

export interface CoupleData {
  id: number;
  pairing_code: string;
  streak_days: number;
  distance_km: number;
  timezone_diff_text: string;
  last_heartbeat_at: string | null;
  last_heartbeat_by: string | null;
  reunion_title: string;
  reunion_city: string;
  reunion_date: string;
  reunion_progress: number;
  partners: Partner[];
  daily_prompt: DailyPrompt | null;
}

const API_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const isDev = typeof window !== 'undefined' && window.location.port.startsWith('517');

const API_BASE = isDev
  ? `http://${API_HOST}:8000/api/couple`
  : '/api/couple';

const WS_BASE = isDev
  ? `ws://${API_HOST}:8000/api/couple/ws`
  : `ws://${typeof window !== 'undefined' ? window.location.host : 'localhost:8000'}/api/couple/ws`;

export async function getCoupleData(): Promise<CoupleData> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error(`Failed to load couple data: ${res.statusText}`);
  return res.json();
}

export interface OnboardPartnerPayload {
  name: string;
  gender?: string | null;
  age?: number | null;
  dob?: string | null;
  city: string;
  avatar_url?: string | null;
  pairing_code?: string | null;
  partner_index?: number | null;
}

export interface OnboardResponse {
  couple: CoupleData;
  partner_index: number;
  pairing_code: string;
  partner_name: string;
}

export async function onboardCouplePartner(payload: OnboardPartnerPayload): Promise<OnboardResponse> {
  const res = await fetch(`${API_BASE}/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to onboard partner' }));
    throw new Error(err.detail || 'Failed to onboard partner');
  }
  return res.json();
}

export async function updatePartnerProfile(payload: {
  partner_index: number;
  name?: string;
  city?: string;
  gender?: string | null;
  age?: number | null;
  dob?: string | null;
  timezone?: string;
  status_message?: string;
  status_emoji?: string;
  avatar_url?: string;
}): Promise<CoupleData> {
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update partner profile');
  return res.json();
}

export async function uploadPartnerAvatar(
  partnerIndex: number,
  imageData: string
): Promise<CoupleData> {
  const res = await fetch(`${API_BASE}/avatar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partner_index: partnerIndex, image_data: imageData }),
  });
  if (!res.ok) throw new Error('Failed to upload avatar image');
  return res.json();
}

export async function updateReunion(payload: {
  reunion_title?: string;
  reunion_city?: string;
  reunion_date?: string;
  reunion_progress?: number;
}): Promise<CoupleData> {
  const res = await fetch(`${API_BASE}/reunion`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update reunion data');
  return res.json();
}

export async function sendLiveHeartbeat(senderName: string): Promise<{ status: string; timestamp: string }> {
  const res = await fetch(`${API_BASE}/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender_name: senderName }),
  });
  if (!res.ok) throw new Error('Failed to send heartbeat');
  return res.json();
}

export async function submitDailyAnswer(
  partnerIndex: number,
  answer: string
): Promise<CoupleData> {
  const res = await fetch(`${API_BASE}/daily-question/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partner_index: partnerIndex, answer }),
  });
  if (!res.ok) throw new Error('Failed to submit answer');
  return res.json();
}

export function subscribeToCoupleRealtime(
  onMessage: (event: { type: string; data?: any; sender?: string; online_partners?: number[] }) => void,
  partnerIndex: number = 0
): () => void {
  let ws: WebSocket | null = null;
  let keepAliveTimer: any = null;
  let reconnectTimer: any = null;

  const connect = () => {
    try {
      const url = `${WS_BASE}?partner_index=${partnerIndex}`;
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`[WebSocket] Connected to Twogether Realtime backend as partner ${partnerIndex}.`);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'REGISTER_PARTNER', partner_index: partnerIndex }));
        }
        keepAliveTimer = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          onMessage(parsed);
        } catch (e) {
          console.error('[WebSocket] Failed to parse message', e);
        }
      };

      ws.onclose = () => {
        clearInterval(keepAliveTimer);
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.warn('[WebSocket] Encountered error', err);
        ws?.close();
      };
    } catch (e) {
      console.warn('[WebSocket] Connection failed, retrying...', e);
      reconnectTimer = setTimeout(connect, 3000);
    }
  };

  connect();

  return () => {
    clearInterval(keepAliveTimer);
    clearTimeout(reconnectTimer);
    if (ws) ws.close();
  };
}
