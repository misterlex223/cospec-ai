import React from 'react';
import { ChevronRight } from 'lucide-react';
import './Breadcrumb.css';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav className={`breadcrumb ${className}`} aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="breadcrumb-item">
              {!isLast ? (
                <>
                  {item.href ? (
                    <a 
                      href={item.href} 
                      className="breadcrumb-link"
                      onClick={(e) => {
                        if (item.onClick) {
                          e.preventDefault();
                          item.onClick();
                        }
                      }}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <button 
                      className="breadcrumb-button"
                      onClick={item.onClick}
                      disabled={!item.onClick}
                    >
                      {item.label}
                    </button>
                  )}
                  <ChevronRight className="breadcrumb-separator" />
                </>
              ) : (
                <span className="breadcrumb-current" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
