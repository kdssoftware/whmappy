import React from 'react';
import { MapPin, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import type { Connection } from '../types';

type Props = {
  systemId: number;
  allConnections: Connection[];
  currentUser: { id: number; name: string } | null;
  visited?: Set<number>;
}

const BACKEND_URL = "http://localhost:8080";

export const SystemChain: React.FC<Props> = ({ systemId, allConnections, currentUser, visited = new Set() }) => {
  
  const setWaypoint = async (targetId: number) => {
    if (!currentUser) {
      alert("Please login with EVE SSO first.");
      return;
    }

    try {
      await axios.post(`${BACKEND_URL}/api/waypoint/${targetId}`, {}, {
        headers: { 'X-Character-ID': currentUser.id.toString() }
      });
      console.log(`Waypoint set for ${targetId}`);
    } catch (err) {
      console.error("Failed to set waypoint:", err);
      alert("Error setting waypoint. Your token might be expired.");
    }
  };

  // Prevent circular mapping
  if (visited.has(systemId)) return <div className="text-red-500 text-xs italic ml-6">Loop detected</div>;
  const newVisited = new Set(visited).add(systemId);

  const links = allConnections.filter(c => c.source_id === systemId);

  return (
    <div className="flex flex-col gap-4 ml-6 border-l border-slate-800 pl-6 mt-2">
      {links.map((link) => (
        <div key={link.id} className="relative">
          {/* Metadata Label */}
          <div className="flex items-center gap-3 mb-2 text-[10px] text-slate-500 font-mono">
            <span className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded uppercase">
              {link.wh_size}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatDistanceToNow(new Date(link.expires_at))}
            </span>
          </div>

          {/* System Card */}
          <div className="flex items-center gap-3 bg-[#161618] p-3 rounded-lg border border-slate-800 shadow-xl">
            <ArrowRight size={14} className="text-slate-600" />
            <div className="flex-1">
              <span className="text-sm font-bold text-slate-100 uppercase tracking-widest">
                {link.target_id}
              </span>
            </div>
            
            <button 
              onClick={() => setWaypoint(link.target_id)}
              className="p-2 hover:bg-blue-500/20 text-blue-500 rounded-md transition-all"
            >
              <MapPin size={16} />
            </button>
          </div>

          {/* Recursively render child connections */}
          <SystemChain 
            systemId={link.target_id} 
            allConnections={allConnections} 
            currentUser={currentUser}
            visited={newVisited} 
          />
        </div>
      ))}
    </div>
  );
};
