import React from 'react';
import { 
  Activity, 
  BarChart2, 
  AlertTriangle, 
  CheckSquare, 
  Sliders, 
  Layers, 
  FileSpreadsheet,
  ShieldCheck
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openAlertsCount: number;
  pendingTasksCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openAlertsCount,
  pendingTasksCount
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'predict', label: 'Single predictor', icon: Activity },
    { id: 'batch', label: 'Batch screening', icon: FileSpreadsheet },
    { 
      id: 'alerts', 
      label: 'Triggers & alerts', 
      icon: AlertTriangle,
      badge: openAlertsCount > 0 ? openAlertsCount : null,
      badgeColor: 'bg-destructive text-destructive-foreground'
    },
    { 
      id: 'tasks', 
      label: 'Care tasks', 
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount : null,
      badgeColor: 'bg-primary text-primary-foreground'
    },
    { id: 'model', label: 'Model insights', icon: Layers },
    { id: 'settings', label: 'Governance & settings', icon: Sliders },
  ];

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
              <Activity className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground tracking-tight text-base">
                  AI Health Copilot
                </span>
                <span className="text-xs font-semibold px-1.5 py-0.2 rounded bg-accent text-accent-foreground border border-border">
                  PRO
                </span>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Type-2 diabetes clinical decision support · ITDO protocol
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
                    isActive
                      ? 'bg-secondary text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className={`text-xs font-mono font-bold px-1.5 py-0.2 rounded-full tabular-nums ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Status Kicker */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-secondary/70 border border-border px-2.5 py-1.5 rounded">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span>AUC-ROC 0.835 holdout</span>
              <span aria-hidden="true" className="text-border">·</span>
              <span className="font-medium text-foreground">
                Inference active
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <nav aria-label="Mobile Navigation" className="lg:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-border scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-muted-foreground bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{item.label}</span>
                {item.badge !== null && item.badge !== undefined && (
                  <span className={`text-xs font-mono px-1 rounded-full tabular-nums ${isActive ? 'bg-card text-foreground' : item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

      </div>
    </header>
  );
};
