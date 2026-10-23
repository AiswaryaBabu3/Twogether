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
import type { CoupleData } from './services/api';
import {
  getCoupleData,
  sendLiveHeartbeat,
  subscribeToCoupleRealtime,
} from './services/api';
import './App.css';

export function App() {
  const [viewMode, setViewMode] = useState<'responsive' | 'desktop' | 'mobile'>('responsive');
  const [activeMobileSection, setActiveMobileSection] = useState<string>('spotlight');
  const [heartCount, setHeartCount] = useState<number>(0);
  const [lastHeartbeat, setLastHeartbeat] = useState<string>('Just now');
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeartItem[]>([]);

  // Couple Data from real backend
  const [coupleData, setCoupleData] = useState<CoupleData | null>(null);

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
    } catch (err) {
      console.warn('Could not load couple data from backend:', err);
    }
  }, []);

  // Check live FastAPI backend health
  const checkBackendHealth = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. App health
      const appRes = await fetch('http://localhost:8000/health').catch(() =>
        fetch('/api/health')
      );
      if (appRes && appRes.ok) {
        const appData = await appRes.json();
        setAppHealth(appData);
      }

      // 2. DB health
      const dbRes = await fetch('http://localhost:8000/health/db').catch(() =>
        fetch('/api/health/db')
      );
      if (dbRes && dbRes.ok) {
        const dbData = await dbRes.json();
        setDbHealth(dbData);
      }

      // 3. Redis health
      const redisRes = await fetch('http://localhost:8000/health/redis').catch(() =>
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

    // Subscribe to real-time WebSocket events from FastAPI backend
    const unsubscribe = subscribeToCoupleRealtime((event) => {
      if (
        event.type === 'COUPLE_UPDATED' ||
        event.type === 'REUNION_UPDATED' ||
        event.type === 'DAILY_QUESTION_ANSWERED'
      ) {
        if (event.data) {
          setCoupleData(event.data);
        }
      } else if (event.type === 'HEARTBEAT') {
        setHeartCount((c) => c + 1);
        setLastHeartbeat(`by ${event.sender || 'Partner'} just now`);
        triggerHearts(6);
      }
    });

    const interval = setInterval(checkBackendHealth, 30000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [loadCouple, checkBackendHealth, triggerHearts]);

  const p1Name = coupleData?.partners?.[0]?.name || 'Alex';

  const handleSendHeart = async () => {
    setHeartCount((c) => c + 1);
    setLastHeartbeat('Just now');
    triggerHearts(6);
    try {
      await sendLiveHeartbeat(p1Name);
    } catch (e) {
      console.warn('Heartbeat send failed', e);
    }
  };

  const handleHeartbeat = async () => {
    setLastHeartbeat('Sent right now');
    triggerHearts(4);
    try {
      await sendLiveHeartbeat(p1Name);
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
      {/* 1. Couple Spotlight Banner */}
      <CoupleSpotlight
        coupleData={coupleData}
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
          onAnswerSubmitted={(updated) => setCoupleData(updated)}
          partnerName={coupleData?.partners?.[1]?.name || 'Maya'}
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
        onOpenProfileMenu={() => handleOpenEdit('user')}
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
    </div>
  );
}

export default App;
