// frontend/src/components/Header.tsx

import React from "react";
import { RefreshCw, User as UserIcon, LogIn } from "lucide-react";
import type { EveUser } from "../types";
import { useIsDT } from "../hooks/useIsDT";

interface Props {
  user: EveUser | null;
  loading: boolean;
  onRefresh: () => void;
  onLogin: () => void;
  onLogout: () => void;
}

export const Header: React.FC<Props> = ({
  user,
  loading,
  onRefresh,
  onLogin,
  onLogout,
}) => {
  const isDT = useIsDT();

  return (
    <header className="max-w-6xl mx-auto flex justify-between items-center mb-12 border-b border-slate-800 pb-6">
      <div className="flex items-center gap-3">
        <img
          src="https://images.evetech.net/corporations/98818601/logo"
          alt="logo"
          className="size-32"
        />
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter leading-none italic">
            WH Mapper
          </h1>
          <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
            - Cult of Magik
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <button
            onClick={onRefresh}
            className="p-2 text-slate-400 hover:text-white transition-colors relative not-disabled:cursor-pointer"
            disabled={isDT}
          >
            <RefreshCw
              size={20}
              className={`${loading ? "animate-spin" : ""} ${isDT ? "text-gray-600" : ""}`}
            />
            <span
              className={`size-3 rounded-full z-10 absolute bottom-0.5 ${isDT ? "bg-red-500" : "bg-green-500 animate-pulse"}`}
            />
          </button>
        )}

        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-md">
              <UserIcon size={16} className="text-blue-400" />
              <span className="text-sm font-medium text-slate-300">
                {user.name}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-slate-500 hover:text-red-400 transition-all"
            >
              <LogIn size={18} className="rotate-180" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            disabled={isDT}
            className="flex items-center gap-2 bg-[#f39c12] not-disabled:hover:bg-[#e67e22] text-black px-4 py-2 rounded font-bold text-sm transition-all shadow-[0_0_15px_rgba(243,156,18,0.2)] disabled:bg-slate-700 cursor-pointer"
          >
            <LogIn size={18} /> LOGIN WITH ESI
          </button>
        )}
      </div>
    </header>
  );
};
