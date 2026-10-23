import { useState, useEffect } from 'react';
import { Plane, Calendar, Sparkles, Edit3 } from 'lucide-react';
import type { CoupleData } from '../services/api';

interface CountdownCardProps {
  coupleData: CoupleData | null;
  onEditReunion: () => void;
}

export const CountdownCard: React.FC<CountdownCardProps> = ({ coupleData, onEditReunion }) => {
  const targetDateStr = coupleData?.reunion_date;
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date(Date.now() + 14 * 86400000);

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 14, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculate = () => {
      const now = new Date().getTime();
      const difference = targetDate.getTime() - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDateStr]);

  const progress = coupleData?.reunion_progress ?? 82;
  const city = coupleData?.reunion_city || 'Paris, France';
  const title = coupleData?.reunion_title || 'Countdown until we hug in person';

  return (
    <div className="glass-panel countdown-widget">
      <div className="countdown-header">
        <div className="badge badge-purple">
          <Plane size={14} />
          <span>Next Reunion</span>
        </div>
        <div className="header-actions-right">
          <div className="destination-tag">
            <Sparkles size={14} color="#FBBF24" />
            <span>{city}</span>
          </div>
          <button
            type="button"
            className="icon-edit-btn"
            onClick={onEditReunion}
            title="Edit reunion destination & date"
          >
            <Edit3 size={14} />
          </button>
        </div>
      </div>

      <div className="countdown-body">
        <h3 className="countdown-title">{title}</h3>
        <p className="countdown-date-sub">
          <Calendar size={14} />
          <span>
            {targetDate.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </p>

        {/* Live Ticking Time Blocks */}
        <div className="countdown-grid">
          <div className="time-block">
            <span className="time-val">{timeLeft.days}</span>
            <span className="time-lbl">Days</span>
          </div>
          <span className="time-colon">:</span>
          <div className="time-block">
            <span className="time-val">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="time-lbl">Hours</span>
          </div>
          <span className="time-colon">:</span>
          <div className="time-block">
            <span className="time-val">{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className="time-lbl">Mins</span>
          </div>
          <span className="time-colon">:</span>
          <div className="time-block">
            <span className="time-val highlight-seconds">{String(timeLeft.seconds).padStart(2, '0')}</span>
            <span className="time-lbl">Secs</span>
          </div>
        </div>

        {/* Progress bar towards reunion */}
        <div className="reunion-progress-box">
          <div className="progress-labels">
            <span>Ticket booked</span>
            <span className="progress-percentage">{progress}% completed</span>
            <span>Airport Gate</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }}>
              <div className="plane-marker">
                <Plane size={14} color="#FFFFFF" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
