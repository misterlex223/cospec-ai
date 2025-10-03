import React from 'react';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';

interface NavigationProps {
  user?: {
    name: string;
    email: string;
  };
  onLogout?: () => void;
  onSettings?: () => void;
}

export function Navigation({ user, onLogout, onSettings }: NavigationProps) {
  const [showDropdown, setShowDropdown] = React.useState(false);
  
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (showDropdown && !(e.target as Element).closest('.dropdown-container')) {
      setShowDropdown(false);
    }
  };

  React.useEffect(() => {
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <nav className="bg-white border-b border-border px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold">C</span>
          </div>
          <span className="font-semibold text-lg text-foreground">CoSpec Markdown</span>
        </div>
        
        {user && (
          <div className="flex items-center space-x-4 dropdown-container relative">
            <Button 
              variant="ghost" 
              className="flex items-center space-x-2"
              onClick={toggleDropdown}
            >
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{user.name}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </Button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-1 w-48 bg-white border rounded shadow-lg z-10 top-full">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {user.email}
                </div>
                <div className="h-px bg-muted my-1"></div>
                {onSettings && (
                  <button 
                    onClick={() => {
                      onSettings();
                      setShowDropdown(false);
                    }}
                    className="w-full text-left flex items-center px-4 py-2 text-sm hover:bg-accent"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    個人設置
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (onLogout) onLogout();
                    setShowDropdown(false);
                  }}
                  className="w-full text-left flex items-center px-4 py-2 text-sm hover:bg-accent"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  登出
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navigation;
