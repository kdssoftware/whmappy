import React, { useState } from 'react';
import { StarIcon, InfoIcon, Pin, ChevronDown } from 'lucide-react';
import { TagManager } from './TagManager';
import { HubRouteList } from './HubRouteList';
import { SystemChain } from './systemChain';
import type { Connection, Tag, HubRoute, EveUser, System } from '../types';
import type { Anoik } from '../anoik';

interface Props {
  wh: System;
  pinIndex: number;
  anoikData: Anoik;
  tags: Record<number, Tag[]>;
  hubRoutes: Record<number, HubRoute[]>;
  connections: Connection[];
  user: EveUser | null;
  onAddTag: (systemId: number, tag: string) => void;
  onDeleteTag: (tagId: number) => void;
  onPin: (systemId: number) => void;
  onUnpin: (systemId: number) => void;
  onUpdate: () => void;
}

export const SystemCard: React.FC<Props> = ({
  wh, pinIndex, anoikData, tags, hubRoutes, connections, user, onAddTag, onDeleteTag, onPin, onUnpin, onUpdate
}) => {
  const[isCollapsed, setIsCollapsed] = useState(true);

  // Border colors repeat: Red -> Green -> Orange -> Yellow
  const PIN_COLORS =['#ef4444', '#22c55e', '#f97316', '#eab308'];
  const isPinned = pinIndex >= 0;
  
  const dynamicStyle = isPinned 
    ? { borderColor: PIN_COLORS[pinIndex % 4], borderWidth: '2px' } 
    : {};

  return (
    <div 
      className={`relative bg-[#111113] p-6 rounded-xl shadow-2xl transition-all ${!isPinned ? 'border border-slate-800' : ''}`}
      style={dynamicStyle}
    >
      <div className={`flex flex-col xl:flex-row xl:justify-between xl:items-start gap-6 ${!isCollapsed ? 'mb-8' : ''}`}>
        
        {/* WH INFO SECTION */}
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="bg-sky-500/10 border border-sky-500/30 px-4 py-2 rounded-lg inline-block self-start relative">
              <div className="flex items-center gap-2 mb-1">
                  { wh.id === 31000302 && (<span className="text-[10px] block uppercase font-black text-sky-500 tracking-widest leading-none">Home</span>)}
                  {anoikData.systems[wh.name] && (
                    <span className="bg-sky-500 text-[9px] text-black px-1.5 py-0.5 rounded font-bold">
                      {anoikData.systems[wh.name].wormholeClass}
                    </span>
                  )}
              </div>
              <div className="flex items-center gap-3">
                <p className="text-2xl font-mono font-bold text-white tracking-tighter uppercase">
                  {wh.name}
                </p>
                <span className="text-xs text-slate-600 font-mono">({wh.id})</span>
                
                {user && (
                  <button 
                    onClick={() => isPinned ? onUnpin(wh.id) : onPin(wh.id)}
                    className={`p-1.5 rounded transition-colors flex items-center justify-center border ${
                      isPinned 
                        ? 'text-sky-400 bg-slate-800 border-sky-900 hover:bg-slate-700' 
                        : 'text-slate-600 bg-transparent border-transparent hover:text-sky-400 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                    title={isPinned ? "Unpin System" : "Pin System"}
                  >
                    <Pin size={16} fill={isPinned ? "currentColor" : "none"} />
                  </button>
                )}
              </div>
            </div>

            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title={isCollapsed ? "Expand System" : "Collapse System"}
            >
              <ChevronDown size={20} className={`transform transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 items-center xl:ml-[44px]">
            {anoikData.systems[wh.name]?.statics?.map((staticCode: string) => {
              const staticInfo = anoikData.wormholes[staticCode];
              return (
                <span key={staticCode} className="text-[10px] bg-slate-800/50 text-slate-400 px-2 py-1 rounded border border-slate-700 font-mono">
                  Static <strong className="text-slate-200">{staticCode}</strong> 
                  <span className="ml-1 opacity-60">({staticInfo?.dest || '???'})</span>
                </span>
              );
            })}
            
            {/* TAGS UI */}
            <TagManager 
              systemId={wh.id} 
              tags={tags[wh.id] ||[]} 
              user={user} 
              onAddTag={onAddTag} 
              onDeleteTag={onDeleteTag} 
            />
            
            {anoikData.systems[wh.name]?.effectName && (
              <span className="text-[10px] bg-purple-900/20 text-purple-400 px-2 py-1 rounded border border-purple-500/30 font-bold uppercase tracking-tighter flex items-center gap-1">
                <StarIcon size={12} fill="currentColor" /> {anoikData.systems[wh.name].effectName}
              </span>
            )}

            <a 
              href={`https://anoik.is/systems/${wh.name}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-sky-400 transition-colors ml-1 p-1 hover:bg-slate-800 rounded"
              title="View on Anoik.is"
            >
              <InfoIcon size={18} />
            </a>
          </div>
        </div>

        {/* HUB NAVIGATION BADGES */}
        <HubRouteList routes={hubRoutes[wh.id] ||[]} />
      </div> 
      { !isCollapsed && 
      <SystemChain 
        systemId={wh.id} 
        allConnections={connections} 
        tags={tags}
        currentUser={user} 
        onUpdate={onUpdate} 
      />
      }
    </div>
  );
};
