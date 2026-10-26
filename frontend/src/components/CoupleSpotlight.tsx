import { useState, useEffect } from 'react';
import { Heart, MapPin, Clock, Moon, Sun, Flame, Radio, Camera } from 'lucide-react';
import type { CoupleData, Partner } from '../services/api';

interface CoupleSpotlightProps {
  coupleData: CoupleData | null;
  activePartnerIndex?: number;
  onHeartbeat: () => void;
  lastHeartbeat: string;
  onEditPartner: (partnerTab: 'user' | 'partner') => void;
}

export const CoupleSpotlight: React.FC<CoupleSpotlightProps> = ({
  coupleData,
  activePartnerIndex = 0,
  onHeartbeat,
  lastHeartbeat,
  onEditPartner,
}) => {
  const userIdx = activePartnerIndex === 1 ? 1 : 0;
  const partnerIdx = userIdx === 0 ? 1 : 0;

  const me: Partner = coupleData?.partners?.[userIdx] || {
    id: 1,
    couple_id: 1,
    name: 'Aishu',
    city: 'Coimbatore, India',
    gender: 'Female',
    age: 24,
    dob: '2001-08-15',
    timezone: 'Asia/Kolkata',
    status_message: 'Coding Twogether App',
    status_emoji: '💻',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
    is_online: true,
    latitude: 11.0168,
    longitude: 76.9558,
  };

  const partner: Partner = coupleData?.partners?.[partnerIdx] || {
    id: 2,
    couple_id: 1,
    name: 'Prago',
    city: 'Bengaluru, India',
    gender: 'Male',
    age: 26,
    dob: '2000-01-04',
    timezone: 'Asia/Kolkata',
    status_message: 'Listening to our playlist',
    status_emoji: '🎧',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80',
    is_online: false,
    latitude: 12.9716,
    longitude: 77.5946,
  };

  const [myTime, setMyTime] = useState<string>('');
  const [partnerTime, setPartnerTime] = useState<string>('');
  const [pulsing, setPulsing] = useState<boolean>(false);

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      try {
        setMyTime(
          now.toLocaleTimeString('en-US', {
            timeZone: me.timezone || 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
        );
      } catch {
        setMyTime(now.toLocaleTimeString());
      }

      try {
        setPartnerTime(
          now.toLocaleTimeString('en-US', {
            timeZone: partner.timezone || 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
        );
      } catch {
        setPartnerTime(now.toLocaleTimeString());
      }
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, [me.timezone, partner.timezone]);

  const handlePulse = () => {
    setPulsing(true);
    onHeartbeat();
    setTimeout(() => setPulsing(false), 1200);
  };

  const myTab: 'user' | 'partner' = userIdx === 0 ? 'user' : 'partner';
  const partnerTab: 'user' | 'partner' = userIdx === 0 ? 'partner' : 'user';

  return (
    <section className="glass-panel couple-spotlight-card">
      {/* Background glowing auras */}
      <div className="spotlight-glow-1" />
      <div className="spotlight-glow-2" />

      {/* Header streak badge */}
      <div className="spotlight-top-bar">
        <div className="badge badge-rose">
          <Flame size={14} />
          <span>Day {coupleData?.streak_days || 48} Streak</span>
        </div>
        <div className="connection-status-pill">
          <Radio size={12} className="live-blink" />
          <span>Realtime Connected</span>
        </div>
      </div>

      {/* Main Grid: You (Left) - Distance Arc - Partner (Right) */}
      <div className="couple-grid">
        {/* Active User (You) */}
        <div className="partner-profile clickable-profile" onClick={() => onEditPartner(myTab)}>
          <div
            className="avatar-wrapper"
            onClick={(e) => {
              e.stopPropagation();
              onEditPartner(myTab);
            }}
            role="button"
            tabIndex={0}
            title="Click to update your photo and profile"
          >
            <div className="avatar-ring avatar-ring-rose" />
            <img
              src={me.avatar_url}
              alt={me.name}
              className="partner-avatar-img"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
              }}
            />
            <span className="online-indicator online" title="You are online" />
            <div className="avatar-edit-overlay">
              <Camera size={20} color="#FFFFFF" />
              <span className="avatar-edit-tooltip">Update Photo</span>
            </div>
            <div className="avatar-floating-badge badge-rose" title="Change photo">
              <Camera size={12} color="#FFFFFF" />
            </div>
          </div>
          <div className="partner-name-row">
            <h2 className="partner-name">{me.name}</h2>
            <span className="you-pill">You</span>
            {me.age && <span className="text-highlight" style={{ fontSize: '0.78rem' }}>({me.age}y)</span>}
            <span className="presence-status-pill online">Online</span>
          </div>
          <div className="partner-location">
            <MapPin size={14} color="#FF758F" />
            <span>{me.city}</span>
          </div>
          <div className="time-card">
            <Sun size={14} color="#FBBF24" />
            <span className="live-clock">{myTime || '08:45 AM'}</span>
            <span className="tz-label">{me.timezone.split('/')[1]?.replace('_', ' ') || 'LOCAL'}</span>
          </div>
          <div className="status-bubble">
            <span className="status-emoji">{me.status_emoji || '💖'}</span>
            <span>{me.status_message || 'Twogether in heart'}</span>
          </div>
        </div>

        {/* Center Distance & Connection Bridge */}
        <div className="connection-bridge">
          <div className="bridge-distance">
            <span className="distance-number">
              {coupleData?.distance_km?.toLocaleString() || '245'}
            </span>
            <span className="distance-unit">km apart</span>
          </div>

          <div className="bridge-visual">
            <div className={`bridge-line ${pulsing ? 'bridge-line-active' : ''}`}>
              <div className="pulsing-wave" />
            </div>
            <button
              type="button"
              className={`heart-sync-btn ${pulsing ? 'pulse-anim' : ''}`}
              onClick={handlePulse}
              title={`Tap to send real-time love pulse to ${partner.name}`}
            >
              <Heart size={26} color="#FFFFFF" fill="#FF4D6D" />
            </button>
          </div>

          <div className="tz-diff-pill">
            <Clock size={12} />
            <span>{coupleData?.timezone_diff_text || 'In the same time zone'}</span>
          </div>

          <p className="last-sync-caption">
            {coupleData?.last_heartbeat_by
              ? `${coupleData.last_heartbeat_by} sent a heartbeat ${lastHeartbeat}`
              : `Tap heart to send love to ${partner.name}`}
          </p>
        </div>

        {/* Partner (The other person) */}
        <div className="partner-profile clickable-profile" onClick={() => onEditPartner(partnerTab)}>
          <div
            className="avatar-wrapper"
            onClick={(e) => {
              e.stopPropagation();
              onEditPartner(partnerTab);
            }}
            role="button"
            tabIndex={0}
            title={`Click to view or edit ${partner.name}'s profile`}
          >
            <div className="avatar-ring avatar-ring-purple" />
            <img
              src={partner.avatar_url}
              alt={partner.name}
              className="partner-avatar-img"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';
              }}
            />
            <span
              className={`online-indicator ${partner.is_online ? 'online' : 'offline'}`}
              title={partner.is_online ? `${partner.name} is active now` : `${partner.name} is offline`}
            />
            <div className="avatar-edit-overlay">
              <Camera size={20} color="#FFFFFF" />
              <span className="avatar-edit-tooltip">Update Photo</span>
            </div>
            <div className="avatar-floating-badge badge-purple" title="Change photo">
              <Camera size={12} color="#FFFFFF" />
            </div>
          </div>
          <div className="partner-name-row">
            <h2 className="partner-name">{partner.name}</h2>
            <span className="partner-pill">Partner</span>
            {partner.age && <span className="text-highlight" style={{ fontSize: '0.78rem' }}>({partner.age}y)</span>}
            <span className={`presence-status-pill ${partner.is_online ? 'online' : 'offline'}`}>
              {partner.is_online ? 'Active now' : 'Offline'}
            </span>
          </div>
          <div className="partner-location">
            <MapPin size={14} color="#A77BFF" />
            <span>{partner.city}</span>
          </div>
          <div className="time-card">
            <Moon size={14} color="#A77BFF" />
            <span className="live-clock">{partnerTime || '08:45 AM'}</span>
            <span className="tz-label">{partner.timezone.split('/')[1]?.replace('_', ' ') || 'LOCAL'}</span>
          </div>
          <div className="status-bubble">
            <span className="status-emoji">{partner.status_emoji || '🎧'}</span>
            <span>{partner.status_message || 'Listening to our playlist'}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
