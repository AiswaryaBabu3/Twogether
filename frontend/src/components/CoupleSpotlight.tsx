import { useState, useEffect } from 'react';
import { Heart, MapPin, Clock, Moon, Sun, Flame, Radio, Camera } from 'lucide-react';
import type { CoupleData, Partner } from '../services/api';

interface CoupleSpotlightProps {
  coupleData: CoupleData | null;
  onHeartbeat: () => void;
  lastHeartbeat: string;
  onEditPartner: (partnerTab: 'user' | 'partner') => void;
}

export const CoupleSpotlight: React.FC<CoupleSpotlightProps> = ({
  coupleData,
  onHeartbeat,
  lastHeartbeat,
  onEditPartner,
}) => {
  const p1: Partner = coupleData?.partners?.[0] || {
    id: 1,
    couple_id: 1,
    name: 'Alex',
    city: 'New York, USA',
    timezone: 'America/New_York',
    status_message: 'Having morning coffee',
    status_emoji: '☕',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80',
    is_online: true,
    latitude: 40.7128,
    longitude: -74.006,
  };

  const p2: Partner = coupleData?.partners?.[1] || {
    id: 2,
    couple_id: 1,
    name: 'Maya',
    city: 'London, UK',
    timezone: 'Europe/London',
    status_message: 'Listening to our playlist',
    status_emoji: '🎧',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80',
    is_online: true,
    latitude: 51.5074,
    longitude: -0.1278,
  };

  const [alexTime, setAlexTime] = useState<string>('');
  const [mayaTime, setMayaTime] = useState<string>('');
  const [pulsing, setPulsing] = useState<boolean>(false);

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      try {
        setAlexTime(
          now.toLocaleTimeString('en-US', {
            timeZone: p1.timezone || 'America/New_York',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
        );
      } catch {
        setAlexTime(now.toLocaleTimeString());
      }

      try {
        setMayaTime(
          now.toLocaleTimeString('en-GB', {
            timeZone: p2.timezone || 'Europe/London',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
        );
      } catch {
        setMayaTime(now.toLocaleTimeString());
      }
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, [p1.timezone, p2.timezone]);

  const handlePulse = () => {
    setPulsing(true);
    onHeartbeat();
    setTimeout(() => setPulsing(false), 1200);
  };

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

      {/* Main Grid: Partner 1 - Distance Arc - Partner 2 */}
      <div className="couple-grid">
        {/* Partner 1 (You) */}
        <div className="partner-profile clickable-profile" onClick={() => onEditPartner('user')}>
          <div
            className="avatar-wrapper"
            onClick={(e) => {
              e.stopPropagation();
              onEditPartner('user');
            }}
            role="button"
            tabIndex={0}
            title="Click to change your profile picture"
          >
            <div className="avatar-ring avatar-ring-rose" />
            <img src={p1.avatar_url} alt={p1.name} className="partner-avatar-img" />
            <span className="online-indicator" title="Active now" />
            <div className="avatar-edit-overlay">
              <Camera size={20} color="#FFFFFF" />
              <span className="avatar-edit-tooltip">Update Photo</span>
            </div>
            <div className="avatar-floating-badge badge-rose" title="Change photo">
              <Camera size={12} color="#FFFFFF" />
            </div>
          </div>
          <div className="partner-name-row">
            <h2 className="partner-name">{p1.name}</h2>
            <span className="you-pill">You</span>
          </div>
          <div className="partner-location">
            <MapPin size={14} color="#FF758F" />
            <span>{p1.city}</span>
          </div>
          <div className="time-card">
            <Sun size={14} color="#FBBF24" />
            <span className="live-clock">{alexTime || '08:45 AM'}</span>
            <span className="tz-label">{p1.timezone.split('/')[1]?.replace('_', ' ') || 'LOCAL'}</span>
          </div>
          <div className="status-bubble">
            <span className="status-emoji">{p1.status_emoji}</span>
            <span>{p1.status_message}</span>
          </div>
        </div>

        {/* Center Distance & Connection Bridge */}
        <div className="connection-bridge">
          <div className="bridge-distance">
            <span className="distance-number">
              {coupleData?.distance_km?.toLocaleString() || '5,567'}
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
              title="Tap to send real-time haptic heartbeat"
            >
              <Heart size={26} color="#FFFFFF" fill="#FF4D6D" />
            </button>
          </div>

          <div className="tz-diff-pill">
            <Clock size={12} />
            <span>{coupleData?.timezone_diff_text || 'Different time zones'}</span>
          </div>

          <p className="last-sync-caption">
            {coupleData?.last_heartbeat_by
              ? `${coupleData.last_heartbeat_by} felt your heartbeat ${lastHeartbeat}`
              : 'Tap heart to send instant pulse'}
          </p>
        </div>

        {/* Partner 2 */}
        <div className="partner-profile clickable-profile" onClick={() => onEditPartner('partner')}>
          <div
            className="avatar-wrapper"
            onClick={(e) => {
              e.stopPropagation();
              onEditPartner('partner');
            }}
            role="button"
            tabIndex={0}
            title="Click to change partner's profile picture"
          >
            <div className="avatar-ring avatar-ring-purple" />
            <img src={p2.avatar_url} alt={p2.name} className="partner-avatar-img" />
            <span className="online-indicator" title="Active now" />
            <div className="avatar-edit-overlay">
              <Camera size={20} color="#FFFFFF" />
              <span className="avatar-edit-tooltip">Update Photo</span>
            </div>
            <div className="avatar-floating-badge badge-purple" title="Change photo">
              <Camera size={12} color="#FFFFFF" />
            </div>
          </div>
          <div className="partner-name-row">
            <h2 className="partner-name">{p2.name}</h2>
            <span className="partner-pill">Partner</span>
          </div>
          <div className="partner-location">
            <MapPin size={14} color="#A77BFF" />
            <span>{p2.city}</span>
          </div>
          <div className="time-card">
            <Moon size={14} color="#A77BFF" />
            <span className="live-clock">{mayaTime || '01:45 PM'}</span>
            <span className="tz-label">{p2.timezone.split('/')[1]?.replace('_', ' ') || 'LOCAL'}</span>
          </div>
          <div className="status-bubble">
            <span className="status-emoji">{p2.status_emoji}</span>
            <span>{p2.status_message}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
