// frontend/src/components/HubRouteList.tsx
import React from "react";
import { TRADE_HUBS } from "../utils";
import type { HubRoute } from "../types";

interface Props {
  routes: HubRoute[];
}

function hubNameColor(hub_name: string) {
  return TRADE_HUBS[hub_name]?.color || "#ffffff";
}

export const HubRouteList: React.FC<Props> = ({ routes }) => {
  if (!routes || routes.length === 0) return null;

  return (
    <div className="grid grid-cols-5 xl:justify-end">
      {routes
        .sort((a, b) => a.hub_name.localeCompare(b.hub_name))
        .map((route) => (
          <div
            key={route.hub_name}
            className="bg-slate-900/80 border border-slate-800 rounded-md px-3 py-2 m-1 min-w-[120px] flex flex-col border-b-2 shadow-inner justify-between"
            style={{
              borderBottomColor: hubNameColor(route.hub_name),
            }}
          >
            <span
              className="text-[10px] font-black text-slate-500 tracking-wide truncate"
              style={{
                color: hubNameColor(route.hub_name),
              }}
            >
              {route.hub_name}
            </span>
            <div className="grid grid-cols-2 grid-rows-1 pt-2">
              <div
                className="flex items-start justify-between gap-y-0.5 flex-col"
                title="Shortest Route"
              >
                <span className="text-xs font-black text-orange-600">
                  {route.total_jumps}j
                </span>
                <div className="text-[9px] text-slate-500 font-medium truncate">
                  via {route.exit_system}
                </div>
              </div>
              <div
                className="flex items-end justify-between gap-y-0.5 flex-col"
                title="High-Sec Only Route"
              >
                <div className="flex items-center gap-x-2">
                  <span className="text-xs font-black text-green-600">
                    {route.total_safe_jumps && route.total_safe_jumps > 0 ? (
                      `${route.total_safe_jumps}j`
                    ) : (
                      <span className="text-slate-600 font-normal italic">
                        N/A
                      </span>
                    )}
                  </span>
                </div>
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
