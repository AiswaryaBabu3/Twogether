import { Heart, Laptop, Smartphone, MonitorSmartphone, Sparkles, UserCheck } from 'lucide-react';
import type { CoupleData } from '../services/api';

interface NavbarProps {
  viewMode: 'responsive' | 'desktop' | 'mobile';
  setViewMode: (mode: 'responsive' | 'desktop' | 'mobile') => void;
  serverStatus: 'healthy' | 'checking' | 'error';
  dbLatency: number | null;
  onSendHeart: () => void;
  heartCount: number;
  coupleData: CoupleData | null;
  onOpenProfileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  setViewMode,
  serverStatus,
  dbLatency,
  onSendHeart,
  heartCount,
  coupleData,
  onOpenProfileMenu,
}) => {
  const p1Name = coupleData?.partners?.[0]?.name || 'Alex';
  const p2Name = coupleData?.partners?.[1]?.name || 'Maya';

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
