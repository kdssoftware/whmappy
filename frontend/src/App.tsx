import { useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw, Database, User as UserIcon, LogIn } from 'lucide-react';
import { SystemChain } from './components/systemChain'; // Ensure case matches filename
import type { Connection } from './types';

const BACKEND_URL = "http://localhost:8080";

interface EveUser {
  id: number;
  name: string;
}

function App() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [rootSystem, setRootSystem] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<EveUser | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Start mapping from Jita (30000142)
      const res = await axios.get(`${BACKEND_URL}/api/map/30000142`);
      setConnections(res.data || []);
      if (res.data?.length > 0) setRootSystem(res.data[0].source_id);
    } catch (err) {
      console.error("Map fetch error:", err);
    } finally {
      setLoading(false);
    }
  };
const handleLogout = async () => {
  if (user) {
    await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, {
      headers: { 'X-Character-ID': user.id.toString() }
    });
  }
  localStorage.setItem('manuallyLoggedOut', 'true');
  setUser(null);
};

const handleLogin = () => {
  localStorage.removeItem('manuallyLoggedOut');
  window.location.href = `${BACKEND_URL}/api/auth/login`;
};

useEffect(() => {
  const isLoggedOut = localStorage.getItem('manuallyLoggedOut');
  
  // ONLY fetch user if we haven't manually logged out
  if (isLoggedOut !== 'true') {
    fetchUser();
  }
  
  fetchData();
}, []);


  const fetchUser = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/auth/me`);
      if (res.data && res.data.length > 0) {
        setUser(res.data[0]); // Take the first logged-in character
      }
    } catch (err) {
      console.error("Auth check error:", err);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 p-8 font-sans">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-12 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">WH mapper</h1>
          </div>
        </div>

<div className="flex items-center gap-4">
{user && <button onClick={fetchData} className="p-2 text-slate-400 hover:text-white transition-colors">
    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
  </button>}

  {user ? (
    <div className="flex items-center gap-3">
      {/* Character Display */}
      <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-md">
        <UserIcon size={16} className="text-blue-400" />
        <span className="text-sm font-medium text-slate-300">{user.name}</span>
      </div>

      {/* Logout Button */}
      <button 
        onClick={handleLogout}
        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all group"
        title="Logout"
      >
        <LogIn size={18} className="rotate-180 transition-transform group-hover:-translate-x-1" />
      </button>
    </div>
  ) : (
    <button 
      onClick={handleLogin}
      className="flex items-center gap-2 bg-[#f39c12] hover:bg-[#e67e22] text-black px-4 py-2 rounded font-bold text-sm transition-all"
    >
      <LogIn size={18} />
      LOGIN WITH EVE ONLINE
    </button>
  )}
</div>
      </header>

      <main className="max-w-6xl mx-auto">
        {rootSystem ? (
          <div>
            {/* Pass the logged in user down to the recursive component */}
            <SystemChain systemId={rootSystem} allConnections={connections} currentUser={user} />
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500">
            No connections found.
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
