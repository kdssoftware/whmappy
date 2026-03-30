// frontend/src/components/HubRouteList.tsx

import React from "react";
import { ShieldCheck, Zap } from "lucide-react";
import { TRADE_HUBS } from "../utils";
import type { HubRoute } from "../types";

interface Props {
  routes: HubRoute[];
}

export const HubRouteList: React.FC<Props> = ({ routes }) => {
  if (!routes || routes.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 xl:justify-end">
      {routes
        .sort((a, b) => a.hub_name.localeCompare(b.hub_name))
        .map((route) => (
          <div
            key={route.hub_name}
            className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg min-w-[120px] flex flex-col border-b-2 shadow-inner"
            style={{ borderBottomColor: TRADE_HUBS[route.hub_name] }}
          >
            <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-2 border-b border-slate-800 pb-1">
              {route.hub_name}
            </span>
            <div className="flex flex-col gap-1">
              {route.total_jumps !== route.total_safe_jumps && (
                <div
                  className="flex items-center justify-between gap-2"
                  title="Shortest Route"
                >
                  <Zap size={10} className="text-orange-700" />
                  <span className="text-xs font-black text-orange-600">
                    {route.total_jumps}j
                  </span>
                  <div className="text-[9px] text-slate-500 font-medium truncate">
                    via {route.exit_system}
                  </div>
                </div>
              )}
              <div
                className="flex items-center justify-between gap-2"
                title="High-Sec Only Route"
              >
                <ShieldCheck size={10} className="text-green-700" />
                <span className="text-xs font-black text-green-600">
                  {route.total_safe_jumps && route.total_safe_jumps > 0 ? (
                    `${route.total_safe_jumps}j`
                  ) : (
                    <span className="text-slate-600 font-normal italic">
                      N/A
                    </span>
                  )}
                </span>
                <div className="text-[9px] text-slate-500 font-medium truncate">
                  via {route.safe_exit_system}
                </div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};
