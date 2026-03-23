import React, { useState } from 'react';
import { MapPin, Clock, ArrowRight, Settings2, Check, X, Trash2 } from 'lucide-react';
import { formatDistanceToNow, addHours } from 'date-fns';
import axios from 'axios';
import type { Connection } from '../types';

type Props = {
  systemId: number;
  allConnections: Connection[];
  currentUser: { id: number; name: string } | null;
  visited?: Set<number>;
  onUpdate?: () => void;
}

const BACKEND_URL = "https://dev.wh.cultofmagik.org";

export const SystemChain: React.FC<Props> = ({ systemId, allConnections, currentUser, visited = new Set(), onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSize, setEditSize] = useState("");
  const [editHours, setEditHours] = useState(24);

  // --- Logic Functions ---
  const startEdit = (link: Connection) => {
    setEditingId(link.id);
    setEditSize(link.wh_size);
  };

  const saveEdit = async (id: string) => {
    try {
      await axios.patch(`${BACKEND_URL}/api/connections/${id}`, {
        wh_size: editSize,
        expires_at: addHours(new Date(), editHours).toISOString()
      });
      setEditingId(null);
      if (onUpdate) onUpdate();
    } catch { console.error("Failed to update"); }
  };

  const deleteConnection = async (id: string) => {
    if (!window.confirm("Are you sure this wormhole has collapsed?")) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/connections/${id}`);
      if (onUpdate) onUpdate();
    } catch { alert("Failed to delete"); }
  };

  const setWaypoint = async (targetId: number) => {
    if (!currentUser) return alert("Please login first!");
    try {
      await axios.post(`${BACKEND_URL}/api/waypoint/${targetId}`, {}, {
        headers: { 'X-Character-ID': currentUser.id.toString() }
      });
    } catch (err) { console.error(err); }
  };

  // --- Recursive Guard ---
  if (visited.has(systemId)) return null; 
  const newVisited = new Set(visited).add(systemId);

  // Find all connections where this system is either the Source or the Target
  const links = allConnections.filter(c => c.source_id === systemId || c.target_id === systemId);

  return (
    <div className="flex flex-col gap-4 ml-6 border-l border-slate-800 pl-6 mt-2">
      {links.map((link) => {
        // Determine the "Other Side" of the connection
        const isSource = link.source_id === systemId;
        const otherId = isSource ? link.target_id : link.source_id;
        const otherName = isSource ? link.target_name : link.source_name;

        // Skip if we've already visited the other side in this branch
        if (visited.has(otherId)) return null;

        return (
          <div key={link.id} className="relative">
            {editingId === link.id ? (
              /* EDIT MODE */
              <div className="bg-sky-900 p-3 rounded-lg border border-blue-500/50 flex flex-wrap gap-3 items-center">
                <select 
                  value={editSize} 
                  onChange={(e) => setEditSize(e.target.value)}
                  className="bg-slate-800 text-xs p-1 rounded border border-slate-700 outline-none"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xl">Extra Large</option>
                </select>
                <div className="flex items-center gap-2 text-xs">
                  <Clock size={12} />
                  <input 
                    type="number" 
                    value={editHours} 
                    onChange={(e) => setEditHours(parseInt(e.target.value))}
                    className="bg-slate-800 w-12 p-1 rounded border border-slate-700"
                  /> 
                  <span>hrs</span>
                </div>
                <div className="flex gap-2 ml-auto">
                  <button onClick={() => saveEdit(link.id)} className="p-1 bg-green-600 rounded hover:bg-green-500"><Check size={14}/></button>
                  <button onClick={() => deleteConnection(link.id)} className="p-1 bg-red-600 rounded hover:bg-red-500"><Trash2 size={14}/></button>
                  <button onClick={() => setEditingId(null)} className="p-1 bg-slate-700 rounded hover:bg-slate-600"><X size={14}/></button>
                </div>
              </div>
            ) : (
              /* VIEW MODE */
              <>
                <div className="flex items-center gap-3 mb-2 text-[10px] text-slate-300 font-mono uppercase">
                  <span className="bg-sky-200 border border-slate-700 px-2 py-0.5 rounded text-sky-900 font-bold">{link.wh_size}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {formatDistanceToNow(new Date(link.expires_at))}
                  </span>
                  {currentUser && (
                    <div className="ml-auto flex gap-3">
                      <button onClick={() => startEdit(link)} className="hover:text-blue-400 flex items-center gap-1">
                        <Settings2 size={10} /> EDIT
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-slate-800 group hover:border-slate-700 transition-colors shadow-lg">
                  <ArrowRight size={14} className="text-slate-600" />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-slate-100 tracking-wider">
                      {otherName} <span className="text-[10px] text-slate-500 font-normal ml-1">({otherId})</span>
                    </span>
                  </div>
                  <button onClick={() => setWaypoint(otherId)} className="p-2 hover:bg-blue-500/20 text-blue-500 rounded-md">
                    <MapPin size={16} />
                  </button>
                </div>
              </>
            )}

            {/* Recurse from the other side */}
            <SystemChain 
              systemId={otherId} 
              allConnections={allConnections} 
              currentUser={currentUser}
              visited={newVisited}
              onUpdate={onUpdate}
            />
          </div>
        );
      })}
    </div>
  );
};
