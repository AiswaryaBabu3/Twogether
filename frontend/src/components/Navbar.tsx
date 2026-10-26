import {
  Heart,
  Laptop,
  Smartphone,
  MonitorSmartphone,
  Sparkles,
  UserCheck,
  RefreshCw,
  Users,
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
  onSwitchIdentity: () => void;
  onOpenProfileMenu: () => void;
  onOpenOnboarding: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  setViewMode,
  serverStatus,
  dbLatency,
  onSendHeart,
  heartCount,
  coupleData,
  activePartnerIndex,
  onSwitchIdentity,
  onOpenProfileMenu,
  onOpenOnboarding,
}) => {
  const p1 = coupleData?.partners?.[0];
  const p2 = coupleData?.partners?.[1];

  const p1Name = p1?.name || 'Aishu';
  const p2Name = p2?.name || 'Prago';

  const currentUser = activePartnerIndex === 1 ? p2 : p1;
  const otherUser = activePartnerIndex === 1 ? p1 : p2;

  const currentName = currentUser?.name || (activePartnerIndex === 1 ? p2Name : p1Name);
  const otherName = otherUser?.name || (activePartnerIndex === 1 ? p1Name : p2Name);

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
          {/* Active Identity Switcher */}
          <div className="identity-switcher-pill" title="Current active user perspective on this device">
            {currentUser?.avatar_url && (
              <img
                src={currentUser.avatar_url}
                alt={currentName}
                className="identity-avatar-tiny"
              />
            )}
            <span className="identity-name-text">{currentName}</span>
            <span className="identity-badge-you">You</span>
            <button
              type="button"
              className="btn-switch-identity"
              onClick={onSwitchIdentity}
              title={`Switch perspective to ${otherName}`}
            >
              <RefreshCw size={11} />
              <span>Switch to {otherName}</span>
            </button>
          </div>

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
