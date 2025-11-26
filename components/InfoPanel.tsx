import React, { forwardRef } from 'react';
import { GeoData } from '../types';

interface InfoPanelProps {
  data: GeoData;
  style?: React.CSSProperties;
}

const InfoPanel = forwardRef<HTMLDivElement, InfoPanelProps>(({ data, style }, ref) => {
  return (
    <div 
      ref={ref}
      style={style}
      className="absolute w-80 glass-panel p-4 text-holo-cyan font-mono z-20 overflow-hidden transform transition-transform duration-75 ease-out rounded-sm"
    >
      {/* Decorative header line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-holo-cyan to-transparent opacity-50"></div>
      
      <div className="flex justify-between items-end border-b border-cyan-800 pb-2 mb-3">
        <h3 className="text-xl font-bold tracking-widest">GEO.INTEL</h3>
        <span className="text-xs animate-pulse">LIVE_FEED</span>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs text-cyan-600 mb-1">TARGET_REGION</p>
          <p className="text-lg font-bold">{data.region}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-cyan-600 mb-1">POP.DENSITY</p>
            <div className="flex items-center">
              <span className="text-md">{data.population}</span>
            </div>
            {/* Fake bar chart */}
            <div className="w-full h-1 bg-cyan-900 mt-1">
              <div className="h-full bg-holo-cyan animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-cyan-600 mb-1">THREAT_LVL</p>
            <span className={`text-md font-bold ${data.threatLevel === 'HIGH' ? 'text-red-400' : 'text-holo-cyan'}`}>
              {data.threatLevel}
            </span>
          </div>
        </div>

        <div>
           <p className="text-xs text-cyan-600 mb-1">STATUS</p>
           <p className="text-xs tracking-tight">{data.status}</p>
        </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-holo-cyan"></div>
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-holo-cyan"></div>
    </div>
  );
});

InfoPanel.displayName = "InfoPanel";
export default InfoPanel;