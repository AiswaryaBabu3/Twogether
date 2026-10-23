import { useState } from 'react';
import { Database, Server, Cpu, RefreshCw, CheckCircle, AlertCircle, Zap } from 'lucide-react';

interface BackendHealthPanelProps {
  dbHealth: any;
  redisHealth: any;
  appHealth: any;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const BackendHealthPanel: React.FC<BackendHealthPanelProps> = ({
  dbHealth,
  redisHealth,
  appHealth,
  onRefresh,
  isRefreshing,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  return (
    <div className="glass-panel telemetry-widget">
      <div className="telemetry-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="telemetry-title-group">
          <Zap size={16} color="#00F0FF" />
          <h4 className="telemetry-title">System & Cloud Infrastructure</h4>
          <span className="badge badge-emerald">Live Telemetry</span>
        </div>

        <div className="telemetry-header-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`refresh-health-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={onRefresh}
            title="Re-check health from FastAPI backend"
          >
            <RefreshCw size={14} />
            <span>Test Connection</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="telemetry-grid">
          {/* FastAPI Core */}
          <div className="telemetry-card">
            <div className="t-card-icon">
              <Server size={20} color="#FF758F" />
            </div>
            <div className="t-card-info">
              <div className="t-card-label">FastAPI Backend</div>
              <div className="t-card-value">
                {appHealth?.status === 'ok' ? (
                  <span className="text-emerald">Online ({appHealth.version})</span>
                ) : (
                  <span className="text-rose">Connecting...</span>
                )}
              </div>
              <div className="t-card-sub">Port 8000 • Async Lifespan</div>
            </div>
            <div className="t-card-status">
              {appHealth?.status === 'ok' ? (
                <CheckCircle size={16} color="#10B981" />
              ) : (
                <AlertCircle size={16} color="#F59E0B" />
              )}
            </div>
          </div>

          {/* Supabase PostgreSQL */}
          <div className="telemetry-card">
            <div className="t-card-icon">
              <Database size={20} color="#00F0FF" />
            </div>
            <div className="t-card-info">
              <div className="t-card-label">Supabase PostgreSQL</div>
              <div className="t-card-value">
                {dbHealth?.status === 'healthy' ? (
                  <span className="text-emerald">
                    Connected ({Math.round(dbHealth.latency_ms)}ms)
                  </span>
                ) : (
                  <span className="text-amber">Connecting pooler...</span>
                )}
              </div>
              <div className="t-card-sub">SQLAlchemy 2.x • asyncpg</div>
            </div>
            <div className="t-card-status">
              {dbHealth?.status === 'healthy' ? (
                <CheckCircle size={16} color="#10B981" />
              ) : (
                <AlertCircle size={16} color="#F59E0B" />
              )}
            </div>
          </div>

          {/* Redis Cache */}
          <div className="telemetry-card">
            <div className="t-card-icon">
              <Cpu size={20} color="#A77BFF" />
            </div>
            <div className="t-card-info">
              <div className="t-card-label">Redis Async Cache</div>
              <div className="t-card-value">
                {redisHealth?.status === 'healthy' ? (
                  <span className="text-emerald">
                    Active ({Math.round(redisHealth.latency_ms)}ms)
                  </span>
                ) : redisHealth?.status === 'disabled' ? (
                  <span className="text-dim">Disabled</span>
                ) : (
                  <span className="text-amber">Local Port 6379</span>
                )}
              </div>
              <div className="t-card-sub">RESP2 Protocol • Connection Pool</div>
            </div>
            <div className="t-card-status">
              {redisHealth?.status === 'healthy' ? (
                <CheckCircle size={16} color="#10B981" />
              ) : (
                <CheckCircle size={16} color="#94A3B8" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
