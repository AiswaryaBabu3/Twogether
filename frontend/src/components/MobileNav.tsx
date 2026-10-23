import { Heart, Calendar, Gamepad2, Camera, Activity } from 'lucide-react';

interface MobileNavProps {
  activeSection: string;
  setActiveSection: (sec: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeSection, setActiveSection }) => {
  const tabs = [
    { id: 'spotlight', label: 'Together', icon: Heart },
    { id: 'countdown', label: 'Reunion', icon: Calendar },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'memories', label: 'Memories', icon: Camera },
    { id: 'health', label: 'System', icon: Activity },
  ];

  return (
    <nav className="mobile-bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeSection === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setActiveSection(tab.id)}
          >
            <div className="nav-icon-container">
              <Icon size={20} />
            </div>
            <span className="mobile-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
