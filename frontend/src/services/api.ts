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

export interface ChatMessage {
  id: number;
  couple_id: number;
  sender_index: number;
  sender_name: string;
  message_type: 'text' | 'image' | 'call_log';
  content?: string | null;
  image_url?: string | null;
  is_read: boolean;
  reply_to_id?: number | null;
  reply_to_text?: string | null;
  reply_to_sender?: string | null;
  reactions?: Record<string, string>;
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_at: string;
}

const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8000';
const wsProto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';

// Proxy through Vite or same-origin backend
const API_BASE = '/api/couple';
const WS_BASE = `${wsProto}//${host}/api/couple/ws`;

// Cross-tab broadcast channel for instant multi-tab sync
export const coupleSyncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('twogether_sync_channel')
  : null;

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
  const updated: CoupleData = await res.json();
  if (coupleSyncChannel) {
    coupleSyncChannel.postMessage({ type: 'DAILY_QUESTION_ANSWERED', data: updated });
  }
  return updated;
}

export async function resetDailyQuestion(): Promise<CoupleData> {
  const res = await fetch(`${API_BASE}/daily-question/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to reset daily question');
  const updated: CoupleData = await res.json();
  if (coupleSyncChannel) {
    coupleSyncChannel.postMessage({ type: 'DAILY_QUESTION_ANSWERED', data: updated });
  }
  return updated;
}

export async function updateDailyQuestion(question: string): Promise<CoupleData> {
  const res = await fetch(`${API_BASE}/daily-question/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error('Failed to update daily question');
  const updated: CoupleData = await res.json();
  if (coupleSyncChannel) {
    coupleSyncChannel.postMessage({ type: 'DAILY_QUESTION_ANSWERED', data: updated });
  }
  return updated;
}

export async function getChatMessages(limit: number = 150): Promise<ChatMessage[]> {
  const res = await fetch(`${API_BASE}/chat/messages?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to load chat messages');
  return res.json();
}

export async function sendChatMessage(data: {
  sender_index: number;
  content?: string;
  message_type?: string;
  image_url?: string;
  reply_to_id?: number | null;
  reply_to_text?: string | null;
  reply_to_sender?: string | null;
}): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE}/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to send message');
  const msg: ChatMessage = await res.json();
  if (coupleSyncChannel) {
    coupleSyncChannel.postMessage({ type: 'CHAT_MESSAGE', message: msg });
  }
  return msg;
}

export async function sendChatPhoto(data: {
  sender_index: number;
  image_data: string;
  caption?: string;
  reply_to_id?: number | null;
  reply_to_text?: string | null;
  reply_to_sender?: string | null;
}): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE}/chat/upload-photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to share photo');
  const msg: ChatMessage = await res.json();
  if (coupleSyncChannel) {
    coupleSyncChannel.postMessage({ type: 'CHAT_MESSAGE', message: msg });
  }
  return msg;
}

export async function reactToChatMessage(
  message_id: number,
  sender_index: number,
  emoji: string
): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE}/chat/react`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id, sender_index, emoji }),
  });
  if (!res.ok) throw new Error('Failed to react to message');
  const msg: ChatMessage = await res.json();
  if (coupleSyncChannel) {
    coupleSyncChannel.postMessage({ type: 'CHAT_MESSAGE_UPDATED', message: msg });
  }
  return msg;
}

export async function deleteChatMessage(
  message_id: number,
  sender_index: number
): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE}/chat/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id, sender_index }),
  });
  if (!res.ok) throw new Error('Failed to delete message');
  const msg: ChatMessage = await res.json();
  if (coupleSyncChannel) {
    coupleSyncChannel.postMessage({ type: 'CHAT_MESSAGE_UPDATED', message: msg });
  }
  return msg;
}

export async function markChatRead(reader_index: number): Promise<void> {
  try {
    await fetch(`${API_BASE}/chat/mark-read?reader_index=${reader_index}`, {
      method: 'POST',
    });
    if (coupleSyncChannel) {
      coupleSyncChannel.postMessage({ type: 'CHAT_READ', reader_index });
    }
  } catch (e) {
    console.warn('Failed to mark chat as read:', e);
  }
}

let activeWsInstance: WebSocket | null = null;

export function sendWebSocketSignal(signal: any): boolean {
  let sent = false;
  if (activeWsInstance && activeWsInstance.readyState === WebSocket.OPEN) {
    activeWsInstance.send(JSON.stringify(signal));
    sent = true;
  }
  if (coupleSyncChannel) {
    coupleSyncChannel.postMessage(signal);
  }
  return sent;
}

export function subscribeToCoupleRealtime(
  onMessage: (event: any) => void,
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
        activeWsInstance = ws;
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
        if (activeWsInstance === ws) {
          activeWsInstance = null;
        }
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
    if (activeWsInstance === ws) {
      activeWsInstance = null;
    }
    if (ws) ws.close();
  };
}
