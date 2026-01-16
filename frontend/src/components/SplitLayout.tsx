import React, { type ReactNode } from 'react';
import './SplitLayout.css';

interface SplitLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  bottomPanel: ReactNode;
}

const SplitLayout: React.FC<SplitLayoutProps> = ({
  leftPanel,
  rightPanel,
  bottomPanel
}) => {
  return (
    <div className="split-layout">
      <div className="main-split">
        <div className="left-panel">{leftPanel}</div>
        <div className="right-panel">{rightPanel}</div>
      </div>
      <div className="bottom-panel">{bottomPanel}</div>
    </div>
  );
};

export default SplitLayout;
