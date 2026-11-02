import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { CoupleSpotlight } from './components/CoupleSpotlight';
import { CountdownCard } from './components/CountdownCard';
import { DailyGameCard } from './components/DailyGameCard';
import { MemoriesGallery } from './components/MemoriesGallery';
import { BackendHealthPanel } from './components/BackendHealthPanel';
import { FloatingHearts } from './components/FloatingHearts';
import type { FloatingHeartItem } from './components/FloatingHearts';
import { MobileNav } from './components/MobileNav';
import { ProfileMenuModal } from './components/ProfileMenuModal';
import { CoupleOnboardingModal } from './components/CoupleOnboardingModal';
import { PrivateChatModal } from './components/PrivateChatModal';
import { VideoCallModal } from './components/VideoCallModal';
import { MessageCircle, PhoneCall, PhoneOff, Video } from 'lucide-react';
import type { CoupleData } from './services/api';
import {
  getCoupleData,
  sendLiveHeartbeat,
  subscribeToCoupleRealtime,
  coupleSyncChannel,
  sendWebSocketSignal,
} from './services/api';
import './App.css';

export function App() {
  const [viewMode, setViewMode] = useState<'responsive' | 'desktop' | 'mobile'>('responsive');
  const [activeMobileSection, setActiveMobileSection] = useState<string>('spotlight');
  const [heartCount, setHeartCount] = useState<number>(0);
  const [lastHeartbeat, setLastHeartbeat] = useState<string>('Just now');
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeartItem[]>([]);

  // Private Chat & WebRTC Video Call States
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [showVideoCallModal, setShowVideoCallModal] = useState<boolean>(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [incomingCallOffer, setIncomingCallOffer] = useState<any>(null);
  const [isCallerMode, setIsCallerMode] = useState<boolean>(true);
  const [incomingCallerName, setIncomingCallerName] = useState<string>('');
  const [showIncomingCallBanner, setShowIncomingCallBanner] = useState<boolean>(false);

  // Couple Data from real backend
  const [coupleData, setCoupleData] = useState<CoupleData | null>(null);

  // Active Partner Perspective (0 = Partner 1 e.g. Aishu, 1 = Partner 2 e.g. Prago)
  const [activePartnerIndex, setActivePartnerIndex] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pParam = params.get('partner') || params.get('user');
      if (pParam) {
        if (pParam.toLowerCase() === 'aishu' || pParam === '0') {
          localStorage.setItem('twogether_partner_index', '0');
          return 0;
        }
        if (pParam.toLowerCase() === 'prago' || pParam === '1') {
          localStorage.setItem('twogether_partner_index', '1');
          return 1;
        }
      }
    }
    const saved = localStorage.getItem('twogether_partner_index');
    return saved !== null ? Number(saved) : 0;
  });

  // Couple Onboarding & Pairing Modal State (starts false until couple data is inspected)
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);

  // Profile Menu Modal State
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [profileModalTab, setProfileModalTab] = useState<'user' | 'partner' | 'reunion'>('user');

  // Backend Health States
  const [appHealth, setAppHealth] = useState<any>(null);
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [redisHealth, setRedisHealth] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<'healthy' | 'checking' | 'error'>('checking');

  // Trigger floating hearts
  const triggerHearts = useCallback((count = 5) => {
    const newHearts: FloatingHeartItem[] = [];
    for (let i = 0; i < count; i++) {
      newHearts.push({
        id: Date.now() + Math.random(),
        x: Math.random() * 80 + 10,
        size: Math.floor(Math.random() * 24) + 18,
        color: ['#FF4D6D', '#FF758F', '#A77BFF', '#FFB703'][Math.floor(Math.random() * 4)],
      });
    }
    setFloatingHearts((prev) => [...prev, ...newHearts]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => !newHearts.some((nh) => nh.id === h.id)));
    }, 3200);
  }, []);

  // Fetch couple data from backend
  const loadCouple = useCallback(async () => {
    try {
      const data = await getCoupleData();
      setCoupleData(data);

      const hasOnboardedFlag = localStorage.getItem('twogether_onboarded') === 'true';
      const hasConfiguredPartner =
        Boolean(data?.partners && data.partners.length > 0 && data.partners[0].name && data.partners[0].name.trim());

      if (hasConfiguredPartner || hasOnboardedFlag) {
        // Couple is already configured and user is logged in
        localStorage.setItem('twogether_onboarded', 'true');
        setShowOnboardingModal(false);
      } else {
        // Only brand new, unconfigured space without any partner triggers onboarding modal
        setShowOnboardingModal(true);
      }
    } catch (err) {
      console.warn('Could not load couple data from backend:', err);
    }
  }, []);

  // Check live FastAPI backend health
  const checkBackendHealth = useCallback(async () => {
    setIsRefreshing(true);
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const isDev = typeof window !== 'undefined' && window.location.port.startsWith('517');
    const backendBase = isDev ? `http://${host}:8000` : '';

    try {
      // 1. App health
      const appRes = await fetch(`${backendBase}/health`).catch(() =>
        fetch('/api/health')
      );
      if (appRes && appRes.ok) {
        const appData = await appRes.json();
        setAppHealth(appData);
      }

      // 2. DB health
      const dbRes = await fetch(`${backendBase}/health/db`).catch(() =>
        fetch('/api/health/db')
      );
      if (dbRes && dbRes.ok) {
        const dbData = await dbRes.json();
        setDbHealth(dbData);
      }

      // 3. Redis health
      const redisRes = await fetch(`${backendBase}/health/redis`).catch(() =>
        fetch('/api/health/redis')
      );
      if (redisRes && redisRes.ok) {
        const redisData = await redisRes.json();
        setRedisHealth(redisData);
      }

      setServerStatus('healthy');
    } catch {
      setServerStatus('error');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCouple();
    checkBackendHealth();

    // 1. Subscribe to real-time WebSocket events from FastAPI backend
    const unsubscribe = subscribeToCoupleRealtime((event) => {
      if (
        event.type === 'COUPLE_UPDATED' ||
        event.type === 'REUNION_UPDATED' ||
        event.type === 'DAILY_QUESTION_ANSWERED'
      ) {
        if (event.data) {
          setCoupleData(event.data);
        }
      } else if (event.type === 'PRESENCE_UPDATED') {
        const onlineIndices: number[] = event.online_partners || [];
        setCoupleData((prev) => {
          if (!prev) return prev;
          const updatedPartners = prev.partners.map((p, idx) => ({
            ...p,
            is_online: onlineIndices.includes(idx),
          }));
          return { ...prev, partners: updatedPartners };
        });
      } else if (event.type === 'HEARTBEAT') {
        setHeartCount((c) => c + 1);
        setLastHeartbeat(`by ${event.sender || 'Partner'} just now`);
        triggerHearts(6);
      } else if (event.type === 'CHAT_MESSAGE' || event.type === 'CHAT_MESSAGE_UPDATED') {
        window.dispatchEvent(new CustomEvent('chat_event', { detail: event }));
        if (event.type === 'CHAT_MESSAGE' && event.message && event.message.sender_index !== activePartnerIndex) {
          setUnreadChatCount((prev) => (showChatModal ? 0 : prev + 1));
        }
      } else if (event.type === 'CHAT_READ') {
        window.dispatchEvent(new CustomEvent('chat_event', { detail: event }));
      } else if (event.type === 'CALL_RINGING' || event.type === 'CALL_OFFER') {
        if (event.sender_index !== activePartnerIndex) {
          setIncomingCallerName(event.caller_name || 'Your Partner');
          if (event.sdp) setIncomingCallOffer(event.sdp);
          setIsCallerMode(false);
          setShowIncomingCallBanner(true);
          window.dispatchEvent(new CustomEvent('webrtc_signal', { detail: event }));
        }
      } else if (
        event.type === 'CALL_ANSWER' ||
        event.type === 'ICE_CANDIDATE' ||
        event.type === 'CALL_REJECTED' ||
        event.type === 'CALL_ENDED'
      ) {
        if (event.type === 'CALL_REJECTED' || event.type === 'CALL_ENDED') {
          setShowIncomingCallBanner(false);
        }
        window.dispatchEvent(new CustomEvent('webrtc_signal', { detail: event }));
      }
    }, activePartnerIndex);

    // 2. Cross-tab sync channel (immediate sync when partner submits in another browser tab)
    const handleChannelMessage = (ev: MessageEvent) => {
      if (ev.data?.type === 'DAILY_QUESTION_ANSWERED' && ev.data?.data) {
        setCoupleData(ev.data.data);
      } else if (ev.data?.type === 'CHAT_MESSAGE' || ev.data?.type === 'CHAT_MESSAGE_UPDATED') {
        window.dispatchEvent(new CustomEvent('chat_event', { detail: ev.data }));
        if (ev.data?.type === 'CHAT_MESSAGE' && ev.data.message && ev.data.message.sender_index !== activePartnerIndex) {
          setUnreadChatCount((prev) => (showChatModal ? 0 : prev + 1));
        }
      } else if (ev.data?.type === 'CHAT_READ') {
        window.dispatchEvent(new CustomEvent('chat_event', { detail: ev.data }));
      } else if (ev.data?.type?.startsWith('CALL_') || ev.data?.type === 'ICE_CANDIDATE') {
        if (ev.data.sender_index !== activePartnerIndex) {
          if (ev.data.type === 'CALL_RINGING' || ev.data.type === 'CALL_OFFER') {
            setIncomingCallerName(ev.data.caller_name || 'Your Partner');
            if (ev.data.sdp) setIncomingCallOffer(ev.data.sdp);
            setIsCallerMode(false);
            setShowIncomingCallBanner(true);
          } else if (ev.data.type === 'CALL_REJECTED' || ev.data.type === 'CALL_ENDED') {
            setShowIncomingCallBanner(false);
          }
          window.dispatchEvent(new CustomEvent('webrtc_signal', { detail: ev.data }));
        }
      } else {
        loadCouple();
      }
    };
    coupleSyncChannel?.addEventListener('message', handleChannelMessage);

    // 3. Sync on tab focus / visibility
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadCouple();
      }
    };
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    // 4. Background polling fallback (every 4 seconds for couple data, 30s for health)
    const couplePollTimer = setInterval(loadCouple, 4000);
    const healthPollTimer = setInterval(checkBackendHealth, 30000);

    return () => {
      unsubscribe();
      coupleSyncChannel?.removeEventListener('message', handleChannelMessage);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(couplePollTimer);
      clearInterval(healthPollTimer);
    };
  }, [loadCouple, checkBackendHealth, triggerHearts, activePartnerIndex]);

  // Current active user and other partner details
  const currentPartner = coupleData?.partners?.[activePartnerIndex] || coupleData?.partners?.[0];
  const otherPartner = coupleData?.partners?.[activePartnerIndex === 0 ? 1 : 0] || coupleData?.partners?.[1];

  const currentUserName = currentPartner?.name || (activePartnerIndex === 0 ? 'Aishu' : 'Prago');
  const otherPartnerName = otherPartner?.name || (activePartnerIndex === 0 ? 'Prago' : 'Aishu');

  const handleSendHeart = async () => {
    setHeartCount((c) => c + 1);
    setLastHeartbeat('Just now');
    triggerHearts(6);
    try {
      await sendLiveHeartbeat(currentUserName);
    } catch (e) {
      console.warn('Heartbeat send failed', e);
    }
  };

  const handleHeartbeat = async () => {
    setLastHeartbeat('Sent right now');
    triggerHearts(4);
    try {
      await sendLiveHeartbeat(currentUserName);
    } catch (e) {
      console.warn('Heartbeat send failed', e);
    }
  };

  const handleOpenEdit = (tab: 'user' | 'partner' | 'reunion' = 'user') => {
    setProfileModalTab(tab);
    setShowProfileModal(true);
  };

  const renderDashboardSections = () => (
    <>
      {/* 1. Couple Spotlight Banner (Oriented based on who is using the app) */}
      <CoupleSpotlight
        coupleData={coupleData}
        activePartnerIndex={activePartnerIndex}
        onHeartbeat={handleHeartbeat}
        lastHeartbeat={lastHeartbeat}
        onEditPartner={(tab) => handleOpenEdit(tab)}
      />

      {/* 2. Desktop Two-Column Row: Countdown + Daily Games */}
      <div className="desktop-two-col">
        <CountdownCard
          coupleData={coupleData}
          onEditReunion={() => handleOpenEdit('reunion')}
        />
        <DailyGameCard
          dailyPrompt={coupleData?.daily_prompt || null}
          activePartnerIndex={activePartnerIndex}
          userName={currentUserName}
          partnerName={otherPartnerName}
          onAnswerSubmitted={(updated) => setCoupleData(updated)}
        />
      </div>

      {/* 3. Memories Scrapbook */}
      <MemoriesGallery />

      {/* 4. Live Backend Infrastructure Telemetry */}
      <BackendHealthPanel
        appHealth={appHealth}
        dbHealth={dbHealth}
        redisHealth={redisHealth}
        onRefresh={checkBackendHealth}
        isRefreshing={isRefreshing}
      />
    </>
  );

  return (
    <div className="app-wrapper">
      {/* Ambient background glows */}
      <div className="ambient-glow-rose" />
      <div className="ambient-glow-purple" />

      {/* Floating hearts animation */}
      <FloatingHearts hearts={floatingHearts} />

      {/* Header Navigation */}
      <Navbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        serverStatus={serverStatus}
        dbLatency={dbHealth?.latency_ms ?? null}
        onSendHeart={handleSendHeart}
        heartCount={heartCount}
        coupleData={coupleData}
        activePartnerIndex={activePartnerIndex}
        onOpenProfileMenu={() => handleOpenEdit('user')}
        onOpenOnboarding={() => setShowOnboardingModal(true)}
        onOpenChat={() => {
          setShowChatModal(true);
          setUnreadChatCount(0);
        }}
        unreadChatCount={unreadChatCount}
      />

      {/* Main Viewport Container */}
      <main className="main-content">
        {viewMode === 'mobile' ? (
          /* Mobile Phone Frame Simulator for Laptop Desktop */
          <div className="mobile-simulator-wrapper">
            <div className="mobile-notch" />
            <div className="mobile-simulator-inner">
              {renderDashboardSections()}
            </div>
            <MobileNav
              activeSection={activeMobileSection}
              setActiveSection={setActiveMobileSection}
            />
          </div>
        ) : (
          /* Full Responsive / Laptop View */
          renderDashboardSections()
        )}
      </main>

      {/* Floating Action Button for Twogether Couple Chat */}
      <button
        type="button"
        onClick={() => {
          setShowChatModal((prev) => !prev);
          setUnreadChatCount(0);
        }}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999,
          padding: '12px 22px',
          borderRadius: '30px',
          background: 'linear-gradient(135deg, #FF4D6D 0%, #8A4FFF 100%)',
          color: '#ffffff',
          fontWeight: 700,
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 28px rgba(255, 77, 109, 0.45), 0 0 16px rgba(138, 79, 255, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s',
        }}
        title="Open Private Couple Chat & Video Call"
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <MessageCircle size={22} />
          {unreadChatCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-10px',
                minWidth: '20px',
                height: '20px',
                padding: '0 5px',
                backgroundColor: '#ffffff',
                color: '#FF4D6D',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}
            >
              {unreadChatCount}
            </span>
          )}
        </div>
        <span style={{ fontSize: '14.5px', letterSpacing: '0.3px', fontFamily: 'var(--font-heading, inherit)' }}>
          Private Chat
        </span>
      </button>

      {/* Incoming Video Call Banner / Toast */}
      {showIncomingCallBanner && !showVideoCallModal && (
        <div className="tw-incoming-toast">
          <div className="tw-incoming-info">
            <div className="tw-incoming-icon">
              <Video size={22} />
            </div>
            <div>
              <div className="tw-incoming-name">{incomingCallerName} ❤️</div>
              <div className="tw-incoming-desc">Incoming video call...</div>
            </div>
          </div>

          <div className="tw-incoming-actions">
            <button
              type="button"
              onClick={() => {
                sendWebSocketSignal({
                  type: 'CALL_REJECTED',
                  sender_index: activePartnerIndex,
                  target_index: activePartnerIndex === 1 ? 0 : 1,
                });
                setShowIncomingCallBanner(false);
              }}
              className="tw-incoming-decline-btn"
              title="Decline"
            >
              <PhoneOff size={18} />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowIncomingCallBanner(false);
                setIsCallerMode(false);
                setShowVideoCallModal(true);
              }}
              className="tw-incoming-accept-btn"
              title="Answer Call"
            >
              <PhoneCall size={16} />
              <span>Answer</span>
            </button>
          </div>
        </div>
      )}

      {/* Private Chat Modal */}
      <PrivateChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        coupleData={coupleData}
        activePartnerIndex={activePartnerIndex}
        onStartVideoCall={() => {
          setIsCallerMode(true);
          setIncomingCallOffer(null);
          setShowVideoCallModal(true);
        }}
        onNewMessageReceived={() => {
          if (!showChatModal) {
            setUnreadChatCount((c) => c + 1);
          }
        }}
      />

      {/* WebRTC Video Call Modal */}
      <VideoCallModal
        isOpen={showVideoCallModal}
        onClose={() => {
          setShowVideoCallModal(false);
          setShowIncomingCallBanner(false);
          setIncomingCallOffer(null);
        }}
        coupleData={coupleData}
        activePartnerIndex={activePartnerIndex}
        isCaller={isCallerMode}
        incomingOffer={incomingCallOffer}
      />

      {/* Mobile Bottom Navigation (shown on native mobile viewports) */}
      <MobileNav
        activeSection={activeMobileSection}
        setActiveSection={setActiveMobileSection}
      />

      {/* Profile & Couple Settings Menu Modal */}
      {showProfileModal && coupleData && (
        <ProfileMenuModal
          coupleData={coupleData}
          initialTab={profileModalTab}
          onClose={() => setShowProfileModal(false)}
          onUpdated={(updated) => setCoupleData(updated)}
        />
      )}

      {/* Onboarding & Couple Pairing Modal */}
      <CoupleOnboardingModal
        isOpen={showOnboardingModal}
        currentCoupleData={coupleData}
        currentPartnerIndex={activePartnerIndex}
        onClose={() => {
          localStorage.setItem('twogether_onboarded', 'true');
          setShowOnboardingModal(false);
        }}
        onComplete={(updatedCouple, partnerIdx) => {
          localStorage.setItem('twogether_onboarded', 'true');
          setCoupleData(updatedCouple);
          setActivePartnerIndex(partnerIdx);
          setShowOnboardingModal(false);
        }}
      />
    </div>
  );
}

export default App;
