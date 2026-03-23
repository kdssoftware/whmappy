import { useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw, Database, User as UserIcon, LogIn } from 'lucide-react';
import { SystemChain } from './components/systemChain'; 
import type { Connection } from './types';

const BACKEND_URL = import.meta.env.VITE_API_URL || "https://api.wh.cultofmagik.org";

interface EveUser {
  id: number;
  name: string;
}

axios.defaults.withCredentials = true;

function App() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<EveUser | null>(null);

  /**
   * Fetches all active connections and deduplicates them.
   * If A -> B and B -> A both exist, they are treated as one single link.
   */
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/map/all`);
      const raw: Connection[] = res.data.data || res.data || [];

      const normalized = Object.values(raw.reduce((acc: Record<string, Connection>, curr: Connection) => {
        const key = [curr.source_id, curr.target_id].sort().join('-');
        if (!acc[key]) {
          acc[key] = curr;
        }
        return acc;
      }, {}));

      setConnections(normalized as Connection[]);
    } catch (err) {
      console.error("Map fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches the current logged-in character from the backend
   */
  const fetchUser = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/auth/me`);
      if (res.data && res.data.length > 0) {
        setUser(res.data[0]); 
      }
    } catch (err) {
      console.error("Auth check error:", err);
    }
  };

  /**
   * Auth Handlers
   */
  const handleLogin = () => {
    localStorage.removeItem('manuallyLoggedOut');
    window.location.href = `${BACKEND_URL}/api/auth/login`;
  };

  const handleLogout = async () => {
    if (user) {
      try {
        await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, {
          headers: { 'X-Character-ID': user.id.toString() }
        });
      } catch { console.error("Logout request failed"); }
    }
    localStorage.setItem('manuallyLoggedOut', 'true');
    setUser(null);
  };

  // Initial Load
  useEffect(() => {
    const init = async () => {
      const isLoggedOut = localStorage.getItem('manuallyLoggedOut');
      if (isLoggedOut !== 'true') {
        await fetchUser();
      }
      await fetchData();
    };
    init();
  }, []);

  /**
   * ROOT LOGIC:
   * We want to show the Wormhole (J-space) systems as the primary entry points.
   * A J-space system is defined by an ID >= 31,000,000.
   */
  const jSpaceRoots = Array.from(new Map(
    connections
      .flatMap(c => [
        { id: c.source_id, name: c.source_name },
        { id: c.target_id, name: c.target_name }
      ])
      .filter(sys => sys.id >= 31000000)
      .map(sys => [sys.id, sys])
  ).values()).filter((v,i,a)=>a.findIndex(_v=>_v.id===v.id)===i);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 p-8 font-sans">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-12 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <Database className="text-blue-500" size={32} />
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none italic">WH Mapper</h1>
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">- Cult of Magik</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={fetchData} 
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Refresh Network"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-md">
                <UserIcon size={16} className="text-blue-400" />
                <span className="text-sm font-medium text-slate-300">{user.name}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-400 transition-all"
                title="Logout"
              >
                <LogIn size={18} className="rotate-180" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] text-black px-4 py-2 rounded font-bold text-sm transition-all shadow-[0_0_15px_rgba(243,156,18,0.3)]"
            >
              <LogIn size={18} />
              LOGIN WITH ESI
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
            Active Wormholes
          </h2>
          <span className="text-xs text-slate-600 bg-slate-900 px-2 py-1 rounded border border-slate-800">
            {connections.length} Total Connections
          </span>
        </div>
        
        {jSpaceRoots.length > 0 ? (
          <div className="grid gap-12">
            {jSpaceRoots.map(wh => (
              <div key={wh.id} className="relative bg-[#111113] p-6 rounded-xl border border-slate-800 shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-sky-500/10 border border-sky-500/30 px-4 py-2 rounded-lg">
                    <span className="text-[10px] block uppercase font-black text-sky-500 tracking-widest leading-none mb-1">
                      Wormhole Space
                    </span>
                    <p className="text-xl font-mono font-bold text-white tracking-tighter">
                      {wh.name} <span className="text-xs text-slate-600 ml-1">({wh.id})</span>
                    </p>
                  </div>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-800 to-transparent" />
                </div>
                
                <SystemChain 
                  systemId={wh.id} 
                  allConnections={connections} 
                  currentUser={user} 
                  onUpdate={fetchData} 
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center gap-4">
            <Database className="text-slate-800" size={48} />
            <div className="max-w-xs">
              <p className="text-slate-500 font-medium">No active wormholes detected in the network.</p>
              <p className="text-xs text-slate-600 mt-1 italic">
                {user ? `Go find some holes, ${user.name.split(' ')[0]}!` : "Login and undock to start mapping."}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
