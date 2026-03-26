// frontend/src/App.tsx
import { useEffect, useState } from 'react';
import anoikDataRaw from './anoik.json';
import type { Anoik } from './anoik';
import axios from 'axios';
import { 
  RefreshCw, 
  Database, 
  User as UserIcon, 
  LogIn, 
  StarIcon, 
  InfoIcon,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { SystemChain } from './components/systemChain'; 
import type { Connection, Tag } from './types';
import { TRADE_HUBS } from './utils';

const anoikData = anoikDataRaw as unknown as Anoik;
const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:7777"

interface EveUser {
  id: number;
  name: string;
}

interface HubRoute {
  hub_name: string;
  total_jumps: number;
  total_safe_jumps?: number;
  exit_system: string;
  safe_exit_system?: string;
}

axios.defaults.withCredentials = true;

function App() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [hubRoutes, setHubRoutes] = useState<Record<number, HubRoute[]>>({});
  const [tags, setTags] = useState<Record<number, Tag[]>>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<EveUser | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mapRes, tagsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/map/all`),
        axios.get(`${BACKEND_URL}/api/tags`).catch(() => ({ data: [] }))
      ]);

      const raw: Connection[] = mapRes.data.connections || [];
      const routes: Record<number, HubRoute[]> = mapRes.data.hub_routes || {};
      
      const normalized = Object.values(raw.reduce((acc: Record<string, Connection>, curr: Connection) => {
        const key = [curr.source_id, curr.target_id].sort().join('-');
        if (!acc[key]) acc[key] = curr;
        return acc;
      }, {}));

      // Group tags by system_id
      const groupedTags = (tagsRes.data || []).reduce((acc: Record<number, Tag[]>, tag: Tag) => {
        if (!acc[tag.system_id]) acc[tag.system_id] = [];
        acc[tag.system_id].push(tag);
        return acc;
      }, {});

      setConnections(normalized as Connection[]);
      setHubRoutes(routes);
      setTags(groupedTags);
    } catch (err) {
      console.error("Map fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const addTag = async (systemId: number, name: string) => {
    try {
      await axios.post(`${BACKEND_URL}/api/systems/${systemId}/tags`, { tag: name });
      fetchData();
    } catch { alert("Failed to add tag"); }
  }

  const deleteTag = async (tagId: number) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/tags/${tagId}`);
      fetchData();
    } catch { alert("Failed to delete tag"); }
  }

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/auth/me`);
      if (res.data && res.data.length > 0) setUser(res.data[0]); 
    } catch (err) {
      console.error("Auth check error:", err);
    }
  };

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

  useEffect(() => {
    const init = async () => {
      const isLoggedOut = localStorage.getItem('manuallyLoggedOut');
      if (isLoggedOut !== 'true') await fetchUser();
      await fetchData();
    };
    init();
  }, []);

  const jSpaceRoots = Array.from(new Map(
    connections
      .flatMap(c => [
        { id: c.source_id, name: c.source_name },
        { id: c.target_id, name: c.target_name }
      ])
      .filter(sys => sys.id >= 31000000)
      .map(sys => [sys.id, sys])
  ).values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 p-8 font-sans">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-12 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <img src="https://images.evetech.net/corporations/98818601/logo" alt="logo" className='size-32' />
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none italic">WH Mapper</h1>
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">- Cult of Magik</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={fetchData} className="p-2 text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-md">
                <UserIcon size={16} className="text-blue-400" />
                <span className="text-sm font-medium text-slate-300">{user.name}</span>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-400 transition-all">
                <LogIn size={18} className="rotate-180" />
              </button>
            </div>
          ) : (
            <button onClick={handleLogin} className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] text-black px-4 py-2 rounded font-bold text-sm transition-all shadow-[0_0_15px_rgba(243,156,18,0.2)]">
              <LogIn size={18} /> LOGIN WITH ESI
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto"> 
        {user && jSpaceRoots.length > 0 ? (
          <div className="grid gap-12">
            {jSpaceRoots.map(wh => (
              <div key={wh.id} className="relative bg-[#111113] p-6 rounded-xl border border-slate-800 shadow-2xl">
                <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-6 mb-8">
                  
                  {/* WH INFO SECTION */}
                  <div className="flex flex-col gap-3">
                    <div className="bg-sky-500/10 border border-sky-500/30 px-4 py-2 rounded-lg inline-block self-start">
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
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      {anoikData.systems[wh.name]?.statics?.map(staticCode => {
                        const staticInfo = anoikData.wormholes[staticCode];
                        return (
                          <span key={staticCode} className="text-[10px] bg-slate-800/50 text-slate-400 px-2 py-1 rounded border border-slate-700 font-mono">
                            Static <strong className="text-slate-200">{staticCode}</strong> 
                            <span className="ml-1 opacity-60">({staticInfo?.dest || '???'})</span>
                          </span>
                        );
                      })}
                      
                      {/* TAGS UI */}
                      {tags[wh.id]?.map(t => (
                         <div key={t.id} className="bg-slate-700 text-[10px] px-2 py-1 rounded flex items-center gap-1 border border-slate-600">
                            {t.tag_name}
                            <button onClick={() => deleteTag(t.id)} className="hover:text-red-400">×</button>
                         </div>
                      ))}
                      {(!tags[wh.id] || tags[wh.id].length < 2) && user && (
                          <input 
                             maxLength={255}
                             className="bg-transparent border-b border-slate-600 text-[10px] w-16 px-1" 
                             placeholder="+ tag"
                             onKeyDown={(e) => { if(e.key === 'Enter') addTag(wh.id, (e.target as HTMLInputElement).value) }}
                          />
                      )}
                      
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 xl:justify-end">
                    {hubRoutes[wh.id]?.sort((a,b)=>a.hub_name.localeCompare(b.hub_name)).map((route) => (
                      <div key={route.hub_name} className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg min-w-[120px] flex flex-col border-b-2 shadow-inner" 
                style={{borderBottomColor: TRADE_HUBS[route.hub_name]}}
                      >
                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-2 border-b border-slate-800 pb-1">{route.hub_name}</span>
                        <div className="flex flex-col gap-1">
                            { route.total_jumps !== route.total_safe_jumps &&
                                <div className="flex items-center justify-between gap-2" title="Shortest Route">
                                <Zap size={10} className="text-orange-700" />
                                <span className="text-xs font-black text-orange-600">{route.total_jumps}j</span>
                                <div className="text-[9px] text-slate-500 font-medium truncate">via {route.exit_system}</div>
                           </div>
                        }
                           <div className="flex items-center justify-between gap-2" title="High-Sec Only Route">
                              <ShieldCheck size={10} className="text-green-700" />
                              <span className="text-xs font-black text-green-600">
                                {route.total_safe_jumps && route.total_safe_jumps > 0 
                                  ? `${route.total_safe_jumps}j` 
                                  : <span className="text-slate-600 font-normal italic">N/A</span>}
                              </span>
                            <div className="text-[9px] text-slate-500 font-medium truncate">via {route.safe_exit_system}</div>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div> 

                <SystemChain 
                  systemId={wh.id} 
                  allConnections={connections} 
                  tags={tags}
                  currentUser={user} 
                  onUpdate={fetchData} 
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center gap-4 text-slate-600">
            <Database size={48} className="opacity-20" />
            <p className="font-mono uppercase tracking-widest text-sm">Login and jump through womrholes to add data</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
