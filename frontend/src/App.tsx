// frontend/src/App.tsx
import { useEffect, useState } from "react";
import {
  Database,
  Filter,
  ArrowUpDown,
  CircleQuestionMark,
  Wind,
} from "lucide-react";
import { api } from "./api";
import {
  normalizeConnections,
  groupTagsBySystem,
  getJSpaceRoots,
  getKSpaceExits,
} from "./utils";
import { getSolarSystem } from "./mapSolarSystems";
import { Header } from "./components/Header";
import { SystemCard } from "./components/SystemCard";
import { HubRouteCalculator } from "./components/HubRouteCalculator";
import type { Connection, Tag, HubRoute, EveUser, System } from "./types";

import anoikDataRaw from "./anoik.json";
import type { Anoik } from "./anoik";

const anoikData = anoikDataRaw as unknown as Anoik;

function App() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [hubRoutes, setHubRoutes] = useState<Record<number, HubRoute[]>>({});
  const [tags, setTags] = useState<Record<number, Tag[]>>({});
  const [pinnedSystems, setPinnedSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<EveUser | null>(null);

  // Sorting and Filtering State
  const [sortBy, setSortBy] = useState<string>("new");
  const [filterBy, setFilterBy] = useState<string>("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mapRes, tagsRes] = await Promise.all([
        api.map.getAll(),
        api.tags.getAll().catch(() => ({ data: [] })),
      ]);

      const raw: Connection[] = mapRes.data.connections || [];
      const routes: Record<number, HubRoute[]> = mapRes.data.hub_routes || {};
      const pinned: System[] = mapRes.data.pinned_systems || [];

      setConnections(normalizeConnections(raw));
      setHubRoutes(routes);
      setPinnedSystems(pinned);
      setTags(groupTagsBySystem(tagsRes.data || []));
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
    } catch {
      alert("Failed to add tag");
    }
  };

  const deleteTag = async (tagId: number) => {
    try {
      await api.tags.delete(tagId);
      fetchData();
    } catch {
      alert("Failed to delete tag");
    }
  };

  const handlePin = async (systemId: number) => {
    try {
      await api.systems.pin(systemId);
      fetchData();
    } catch {
      alert("Failed to pin system");
    }
  };

  const handleUnpin = async (systemId: number) => {
    try {
      await api.systems.unpin(systemId);
      fetchData();
    } catch {
      alert("Failed to unpin system");
    }
  };

  const fetchUser = async () => {
    try {
      const res = await api.auth.me();
      if (res.data && res.data.length > 0) setUser(res.data[0]);
    } catch (err) {
      console.error("Auth check error:", err);
    }
  };

  const handleLogin = () => {
    localStorage.removeItem("manuallyLoggedOut");
    window.location.href = api.auth.loginUrl;
  };

  const handleLogout = async () => {
    if (user) {
      try {
        await api.auth.logout(user.id);
      } catch {
        console.error("Logout request failed");
      }
    }
    localStorage.setItem("manuallyLoggedOut", "true");
    setUser(null);
  };

  useEffect(() => {
    const init = async () => {
      const isLoggedOut = localStorage.getItem("manuallyLoggedOut");
      if (isLoggedOut !== "true") await fetchUser();
      await fetchData();
    };
    init();

    const interval = setInterval(
      () => {
        fetchData();
      },
      3 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, []);

  const rawJSpaceRoots = getJSpaceRoots(connections, pinnedSystems);

  // Apply Filters
  let displayedRoots = rawJSpaceRoots;
  if (filterBy !== "all") {
    displayedRoots = displayedRoots.filter((wh) => {
      if (["C1", "C2", "C3", "C4", "C5"].includes(filterBy)) {
        return anoikData.systems[wh.name]?.wormholeClass === filterBy;
      }
      if (["hs", "ls", "null"].includes(filterBy)) {
        const kSpaceExits = getKSpaceExits(wh.id, connections);
        return kSpaceExits.some((exitId) => {
          const sysInfo = getSolarSystem(exitId);
          const sec = sysInfo?.securityStatus ?? 0;
          if (filterBy === "hs") return sec >= 0.45;
          if (filterBy === "ls") return sec > 0.0 && sec < 0.45;
          if (filterBy === "null") return sec <= 0.0;
          return false;
        });
      }
      return true;
    });
  }

  // Apply Sorting
  displayedRoots.sort((a, b) => {
    // Pinned always on top
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;

    if (sortBy === "new" || sortBy === "old") {
      const getLatest = (id: number) => {
        const timestamps = connections
          .filter((c) => c.source_id === id || c.target_id === id)
          .map((c) => new Date(c.created_at).getTime());
        return timestamps.length > 0 ? Math.max(...timestamps) : 0;
      };
      const tA = getLatest(a.id);
      const tB = getLatest(b.id);
      return sortBy === "new" ? tB - tA : tA - tB;
    }

    if (sortBy.startsWith("jumps to ")) {
      const hubName = sortBy.replace("jumps to ", "");
      const getJumps = (id: number) => {
        const route = hubRoutes[id]?.find((r) => r.hub_name === hubName);
        return route && route.total_jumps !== -1 ? route.total_jumps : 9999;
      };
      return getJumps(a.id) - getJumps(b.id);
    }

    if (sortBy === "discovered by me") {
      const isMine = (id: number) =>
        connections.some(
          (c) =>
            (c.source_id === id || c.target_id === id) &&
            c.created_by === user?.id,
        )
          ? 1
          : 0;
      return isMine(b.id) - isMine(a.id);
    }

    return a.name.localeCompare(b.name);
  });

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
        {user && <HubRouteCalculator user={user} />}

        {user && (
          <div className="flex flex-col sm:flex-row gap-6 mb-8 bg-[#111113] p-4 rounded-xl border border-slate-800 shadow-xl items-center">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <ArrowUpDown size={16} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:block">
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-sm p-2 rounded outline-none focus:border-sky-500 transition-colors flex-1"
              >
                <option value="new">Newest</option>
                <option value="old">Oldest</option>
                <option value="jumps to Jita">Jumps to Jita</option>
                <option value="jumps to Dodixie">Jumps to Dodixie</option>
                <option value="jumps to Hek">Jumps to Hek</option>
                <option value="jumps to Amarr">Jumps to Amarr</option>
                <option value="jumps to Current Location">
                  Jumps to Current Location
                </option>
                <option value="discovered by me">Discovered by me</option>
              </select>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Filter size={16} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:block">
                Filter:
              </span>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-sm p-2 rounded outline-none focus:border-sky-500 transition-colors flex-1"
              >
                <option value="all">All Systems</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
                <option value="C3">C3</option>
                <option value="C4">C4</option>
                <option value="C5">C5</option>
                <option value="hs">High-Sec Exit</option>
                <option value="ls">Low-Sec Exit</option>
                <option value="null">Null-Sec Exit</option>
              </select>
            </div>
          </div>
        )}

        {user && displayedRoots.length > 0 ? (
          <div className="grid gap-12">
            {displayedRoots.map((wh) => {
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
              );
            })}
          </div>
        ) : !user ? (
          <div className="text-center py-24 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center gap-4 text-slate-600">
            <Database size={48} className="opacity-20" />
            <p className="font-mono uppercase tracking-widest text-sm">
              Login and jump through wormholes to add data
            </p>
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-red-800 rounded-2xl flex flex-col items-center gap-4 text-red-600">
            <Wind size={48} className="opacity-20" />
            <p className="font-mono uppercase tracking-widest text-sm">
              {filterBy !== "all"
                ? `No ${filterBy} wormhole found`
                : "No wormhole found in system"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
