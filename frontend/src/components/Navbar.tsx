import {
  Heart,
  Laptop,
  Smartphone,
  MonitorSmartphone,
  Sparkles,
  Users,
  MessageCircle,
  UserCheck,
} from 'lucide-react';
import type { CoupleData } from '../services/api';

interface NavbarProps {
  viewMode: 'responsive' | 'desktop' | 'mobile';
  setViewMode: (mode: 'responsive' | 'desktop' | 'mobile') => void;
  serverStatus: 'healthy' | 'checking' | 'error';
  dbLatency: number | null;
  onSendHeart: () => void;
  heartCount: number;
  coupleData: CoupleData | null;
  activePartnerIndex: number;
  onOpenProfileMenu: () => void;
  onOpenOnboarding: () => void;
  onOpenChat: () => void;
  unreadChatCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  setViewMode,
  serverStatus,
  dbLatency,
  onSendHeart,
  heartCount,
  coupleData,
  activePartnerIndex: _activePartnerIndex,
  onOpenProfileMenu,
  onOpenOnboarding,
  onOpenChat,
  unreadChatCount = 0,
}) => {
  const p1 = coupleData?.partners?.[0];
  const p2 = coupleData?.partners?.[1];

  const p1Name = p1?.name || 'Aishu';
  const p2Name = p2?.name || 'Prago';

  return (
    <header className="navbar-container">
      <div className="navbar-content">
        {/* Logo & Tagline */}
        <div className="logo-group">
          <div className="logo-icon-box">
            <Heart className="heartbeat-icon" size={24} color="#FF4D6D" fill="#FF4D6D" />
          </div>
          <div>
            <div className="logo-title">
              Twogether<span className="logo-dot">.</span>
            </div>
            <div className="logo-subtitle">{p1Name} & {p2Name} Space</div>
          </div>
        </div>

        {/* Viewport Switcher for testing Lap vs Mobile */}
        <div className="device-switcher" title="Switch layout preview">
          <button
            type="button"
            className={`switcher-btn ${viewMode === 'responsive' ? 'active' : ''}`}
            onClick={() => setViewMode('responsive')}
          >
            <MonitorSmartphone size={16} />
            <span className="switcher-text">Auto</span>
          </button>
          <button
            type="button"
            className={`switcher-btn ${viewMode === 'desktop' ? 'active' : ''}`}
            onClick={() => setViewMode('desktop')}
          >
            <Laptop size={16} />
            <span className="switcher-text">Laptop</span>
          </button>
          <button
            type="button"
            className={`switcher-btn ${viewMode === 'mobile' ? 'active' : ''}`}
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone size={16} />
            <span className="switcher-text">Mobile</span>
          </button>
        </div>

        {/* Actions & Health Telemetry */}
        <div className="nav-actions">
          {/* Couple Pairing / Setup Button */}
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onOpenOnboarding}
            title="Setup profiles or connect with partner code"
          >
            <Users size={14} color="#FF758F" />
            <span className="profile-btn-text">
              {coupleData?.pairing_code ? `Code: ${coupleData.pairing_code}` : 'Pair App'}
            </span>
          </button>

          {/* Server status pill */}
          <div className="server-pill" title="Live Supabase & Redis telemetry">
            <span
              className={`status-dot ${
                serverStatus === 'healthy' ? 'online' : serverStatus === 'checking' ? 'checking' : 'error'
              }`}
            />
            <span className="status-label">
              {serverStatus === 'healthy' ? (
                <>
                  <span className="text-highlight">Supabase DB</span>{' '}
                  {dbLatency ? `${Math.round(dbLatency)}ms` : 'Connected'}
                </>
              ) : serverStatus === 'checking' ? (
                'Syncing...'
              ) : (
                'Backend Offline'
              )}
            </span>
          </div>

          {/* Private Chat & Video Call Trigger */}
          <button
            type="button"
            className="btn-secondary chat-menu-btn relative"
            onClick={onOpenChat}
            title="Private couple chat, photo sharing & video call"
          >
            <MessageCircle size={16} color="#FF4D6D" />
            <span className="profile-btn-text">Chat & Call</span>
            {unreadChatCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '999px',
                  backgroundColor: '#FF4D6D',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 2px 5px rgba(255, 77, 109, 0.5)',
                }}
              >
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Profile Menu Trigger */}
          <button
            type="button"
            className="btn-secondary profile-menu-btn"
            onClick={onOpenProfileMenu}
            title="Edit profiles, cities, timezones, and reunion goals"
          >
            <UserCheck size={16} color="#A77BFF" />
            <span className="profile-btn-text">Profile Menu</span>
          </button>

          {/* Send Love Button */}
          <button type="button" className="btn-primary send-love-btn" onClick={onSendHeart}>
            <Sparkles size={16} />
            <span>Send Love</span>
            {heartCount > 0 && <span className="heart-counter-badge">+{heartCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
};
