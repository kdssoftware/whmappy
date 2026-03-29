// frontend/src/components/systemChain.tsx

import React, { useState } from "react";
import {
  MapPin,
  Clock,
  ArrowRight,
  Settings2,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow, addHours } from "date-fns";
import { api } from "../api";
import type { Connection, Tag, EveUser } from "../types";
import { isWormholeSystem } from "../utils";
import { SecurityStatus } from "./SecurityStatus";

type Props = {
  systemId: number;
  allConnections: Connection[];
  tags: Record<number, Tag[]>;
  currentUser: EveUser | null;
  visited?: Set<number>;
  onUpdate?: () => void;
};

export const SystemChain: React.FC<Props> = ({
  systemId,
  allConnections,
  tags,
  currentUser,
  visited = new Set(),
  onUpdate,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSize, setEditSize] = useState("");
  const [editHours, setEditHours] = useState(24);

  const startEdit = (link: Connection) => {
    setEditingId(link.id);
    setEditSize(link.wh_size);
  };

  const saveEdit = async (id: string) => {
    try {
      await api.connections.update(id, {
        wh_size: editSize,
        expires_at: addHours(new Date(), editHours).toISOString(),
      });
      setEditingId(null);
      if (onUpdate) onUpdate();
    } catch {
      console.error("Failed to update");
    }
  };

  const deleteConnection = async (id: string) => {
    if (!window.confirm("Are you sure this wormhole has collapsed?")) return;
    try {
      await api.connections.delete(id);
      if (onUpdate) onUpdate();
    } catch {
      alert("Failed to delete");
    }
  };

  const setWaypoint = async (targetId: number) => {
    if (!currentUser) return alert("Please login first!");
    try {
      await api.waypoints.set(targetId, currentUser.id);
    } catch (err) {
      console.error(err);
    }
  };

  if (visited.has(systemId)) return null;
  const newVisited = new Set(visited).add(systemId);

  const links = allConnections.filter(
    (c) => c.source_id === systemId || c.target_id === systemId,
  );

  return (
    <div className="flex flex-col gap-4 ml-6 border-l border-slate-800 pl-6 mt-2">
      {links.map((link) => {
        const isSource = link.source_id === systemId;
        const otherId = isSource ? link.target_id : link.source_id;
        const otherName = isSource ? link.target_name : link.source_name;
        const isWH = isWormholeSystem(otherId);

        if (visited.has(otherId)) return null;

        return (
          <div key={link.id} className="relative">
            {editingId === link.id ? (
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
                  <button
                    onClick={() => saveEdit(link.id)}
                    className="p-1 bg-green-600 rounded hover:bg-green-500"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => deleteConnection(link.id)}
                    className="p-1 bg-red-600 rounded hover:bg-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 bg-slate-700 rounded hover:bg-slate-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2 text-[10px] text-slate-300 font-mono uppercase">
                  <span className="bg-sky-200 border border-slate-700 px-2 py-0.5 rounded text-sky-900 font-bold">
                    {link.wh_size}
                  </span>
                  <span className="flex items-center gap-1 text-lg">
                    <Clock size={14} />
                    {formatDistanceToNow(new Date(link.expires_at))}
                  </span>
                  {currentUser && (
                    <div className="ml-auto flex gap-3">
                      <button
                        onClick={() => startEdit(link)}
                        className="hover:text-blue-400 flex items-center gap-1"
                      >
                        <Settings2 size={10} /> EDIT
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-slate-800 group hover:border-slate-700 transition-colors shadow-lg">
                  <ArrowRight size={14} className="text-slate-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100 tracking-wider">
                        {otherName}
                      </span>
                      <SecurityStatus systemId={otherId} />
                      {/* Chain Tags */}
                      {tags[otherId]?.map((t) => (
                        <span
                          key={t.id}
                          className="text-[9px] bg-slate-900 text-slate-400 px-1 py-0.5 rounded border border-slate-800"
                        >
                          {t.tag_name}
                        </span>
                      ))}
                    </div>
                  </div>
                  {!isWH && (
                    <button
                      onClick={() => setWaypoint(otherId)}
                      className="p-2 hover:bg-blue-500/20 text-blue-500 rounded-md"
                    >
                      <MapPin size={16} />
                    </button>
                  )}
                </div>
              </>
            )}

            <SystemChain
              systemId={otherId}
              allConnections={allConnections}
              tags={tags}
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
