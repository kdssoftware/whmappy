import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { api } from './api';
import { normalizeConnections, groupTagsBySystem, getJSpaceRoots } from './utils';
import { Header } from './components/Header';
import { SystemCard } from './components/SystemCard';
import { HubRouteCalculator } from './components/HubRouteCalculator';
import type { Connection, Tag, HubRoute, EveUser, System } from './types';

import anoikDataRaw from './anoik.json';
import type { Anoik } from './anoik';

const anoikData = anoikDataRaw as unknown as Anoik;

function App() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [hubRoutes, setHubRoutes] = useState<Record<number, HubRoute[]>>({});
  const [tags, setTags] = useState<Record<number, Tag[]>>({});
  const [pinnedSystems, setPinnedSystems] = useState<System[]>([]);
  const[loading, setLoading] = useState(true);
  const [user, setUser] = useState<EveUser | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mapRes, tagsRes] = await Promise.all([
        api.map.getAll(),
        api.tags.getAll().catch(() => ({ data: [] }))
      ]);

      const raw: Connection[] = mapRes.data.connections || [];
      const routes: Record<number, HubRoute[]> = mapRes.data.hub_routes || {};
      const pinned: System[] = mapRes.data.pinned_systems ||[];
      
      setConnections(normalizeConnections(raw));
      setHubRoutes(routes);
      setPinnedSystems(pinned);
      setTags(groupTagsBySystem(tagsRes.data ||[]));
    } catch (err) {
      console.error("Map fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const addTag = async (systemId: number, name: string) => {
    try {
      await api.tags.add(systemId, name);
      fetchData();
    } catch { alert("Failed to add tag"); }
  }

  const deleteTag = async (tagId: number) => {
    try {
      await api.tags.delete(tagId);
      fetchData();
    } catch { alert("Failed to delete tag"); }
  }

  const handlePin = async (systemId: number) => {
    try {
      await api.systems.pin(systemId);
      fetchData();
    } catch { alert("Failed to pin system"); }
  }

  const handleUnpin = async (systemId: number) => {
    try {
      await api.systems.unpin(systemId);
      fetchData();
    } catch { alert("Failed to unpin system"); }
  }

  const fetchUser = async () => {
    try {
      const res = await api.auth.me();
      if (res.data && res.data.length > 0) setUser(res.data[0]); 
    } catch (err) {
      console.error("Auth check error:", err);
    }
  };

  const handleLogin = () => {
    localStorage.removeItem('manuallyLoggedOut');
    window.location.href = api.auth.loginUrl;
  };

  const handleLogout = async () => {
    if (user) {
      try {
        await api.auth.logout(user.id);
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

    // Refresh every 3 minutes
    const interval = setInterval(() => {
      fetchData();
    }, 3 * 60 * 1000);

    return () => clearInterval(interval);
  },[]);

  const jSpaceRoots = getJSpaceRoots(connections, pinnedSystems);

  // Counter to calculate the border color index correctly according to requirement
  let currentPinIndex = 0;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 p-8 font-sans">
      <Header 
        user={user} 
        loading={loading} 
        onRefresh={fetchData} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
      />

      <main className="max-w-6xl mx-auto"> 
        {user && <HubRouteCalculator />}

        {user && jSpaceRoots.length > 0 ? (
          <div className="grid gap-12">
            {jSpaceRoots.map(wh => {
              const pinIndex = wh.is_pinned ? currentPinIndex++ : -1;
              
              return (
                <SystemCard 
                  key={wh.id}
                  wh={wh}
                  pinIndex={pinIndex}
                  anoikData={anoikData}
                  tags={tags}
                  hubRoutes={hubRoutes}
                  connections={connections}
                  user={user}
                  onAddTag={addTag}
                  onDeleteTag={deleteTag}
                  onPin={handlePin}
                  onUnpin={handleUnpin}
                  onUpdate={fetchData}
                />
              )
            })}
          </div>
        ) : (
          !user && (
            <div className="text-center py-24 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center gap-4 text-slate-600">
              <Database size={48} className="opacity-20" />
              <p className="font-mono uppercase tracking-widest text-sm">Login and jump through wormholes to add data</p>
            </div>
          )
        )}
      </main>
    </div>
  );
}

export default App;
