import React from 'react';

const SidebarKitsIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Handle */}
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Box body */}
      <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      {/* Lid divider */}
      <path d="M2 12h7M15 12h7" stroke="currentColor" strokeWidth="1.8" />
      {/* Center latch */}
      <rect x="9" y="10" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
};

export default SidebarKitsIcon;
