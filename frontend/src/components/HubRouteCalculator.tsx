import React, { useState } from 'react';
import { Map, ArrowRight, ShieldCheck, Zap, ArrowDownUp } from 'lucide-react';
import { api } from '../api';
import { TRADE_HUBS } from '../utils';
import type { RouteCalculationResult } from '../types';

export const HubRouteCalculator: React.FC = () => {
  const [fromHub, setFromHub] = useState('Jita');
  const [toHub, setToHub] = useState('Amarr');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteCalculationResult | null>(null);

  const handleSwap = () => {
    setFromHub(toHub);
    setToHub(fromHub);
  };

  const handleCalculate = async () => {
    if (fromHub === toHub) return alert("Please select two distinct hubs.");
    setLoading(true);
    try {
      const res = await api.routes.calc(fromHub, toHub);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to calculate route.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111113] p-6 rounded-xl border border-slate-800 shadow-2xl mb-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none text-sky-500">
        <Map size={150} />
      </div>

      <h2 className="text-lg font-black uppercase tracking-widest text-slate-300 mb-6 flex items-center gap-2">
        <Map size={18} className="text-sky-500" />
        Hub-to-Hub Route Calculator
      </h2>
      
      <div className="flex flex-col md:flex-row items-center gap-4 mb-6 relative z-10">
        <select 
          value={fromHub} 
          onChange={e => setFromHub(e.target.value)} 
          className="bg-slate-900 border border-slate-700 text-slate-200 p-2.5 rounded-lg w-full md:w-56 outline-none focus:border-sky-500 transition-colors"
        >
          {Object.keys(TRADE_HUBS).map(h => <option key={h} value={h}>{h}</option>)}
        </select>

        <button 
          onClick={handleSwap} 
          className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full transition-colors shadow-lg group"
        >
          <ArrowDownUp size={16} className="text-slate-400 group-hover:text-white md:-rotate-90 transition-transform" />
        </button>

        <select 
          value={toHub} 
          onChange={e => setToHub(e.target.value)} 
          className="bg-slate-900 border border-slate-700 text-slate-200 p-2.5 rounded-lg w-full md:w-56 outline-none focus:border-sky-500 transition-colors"
        >
          {Object.keys(TRADE_HUBS).map(h => <option key={h} value={h}>{h}</option>)}
        </select>

        <button 
          onClick={handleCalculate} 
          disabled={loading || fromHub === toHub} 
          className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 disabled:cursor-not-allowed border border-sky-500 text-white font-black tracking-wider text-sm px-8 py-2.5 rounded-lg transition-all w-full md:w-auto md:ml-auto shadow-[0_0_15px_rgba(2,173,209,0.15)] disabled:shadow-none"
        >
          {loading ? 'CALCULATING...' : 'CALCULATE'}
        </button>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 animate-fade-in">
          
          {/* SECURE ROUTE (Displayed First) */}
          <div className="bg-slate-900/80 p-5 rounded-lg border-l-4 border-l-green-500 border-t border-r border-b border-slate-800 flex flex-col gap-3 shadow-inner">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-green-500" /> Safe Route (High-Sec)
              </span>
              <span className="text-2xl font-black text-green-500 leading-none">
                {result.secure.total_jumps === -1 ? 'N/A' : `${result.secure.total_jumps}j`}
              </span>
            </div>

            {result.secure.total_jumps !== -1 && (
              result.secure.route_type === 'Direct' ? (
                <div className="text-sm text-slate-400 font-mono mt-1 bg-slate-800/50 inline-block px-3 py-1.5 rounded-md border border-slate-700/50">
                  Direct via High-Sec
                </div>
              ) : (
                <div className="text-sm text-slate-300 font-mono flex items-center flex-wrap gap-2 mt-1">
                  <span className="text-sky-400 font-bold">{result.secure.entrance}</span>
                  <ArrowRight size={14} className="text-slate-600" />
                  
                  {result.secure.wh_path?.map((whName, idx) => (
                    <React.Fragment key={idx}>
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                        {whName}
                      </span>
                      <ArrowRight size={14} className="text-slate-600" />
                    </React.Fragment>
                  ))}

                  <span className="text-sky-400 font-bold">{result.secure.exit}</span>
                </div>
              )
            )}
          </div>

          {/* SHORTEST ROUTE (Displayed Second) */}
          <div className="bg-slate-900/80 p-5 rounded-lg border-l-4 border-l-orange-500 border-t border-r border-b border-slate-800 flex flex-col gap-3 shadow-inner">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Zap size={14} className="text-orange-500" /> Shortest Route (Any Space)
              </span>
              <span className="text-2xl font-black text-orange-500 leading-none">
                {result.shortest.total_jumps === -1 ? 'N/A' : `${result.shortest.total_jumps}j`}
              </span>
            </div>
            
            {result.shortest.total_jumps !== -1 && (
              result.shortest.route_type === 'Direct' ? (
                <div className="text-sm text-slate-400 font-mono mt-1 bg-slate-800/50 inline-block px-3 py-1.5 rounded-md border border-slate-700/50">
                  Direct via Known Space
                </div>
              ) : (
                <div className="text-sm text-slate-300 font-mono flex items-center flex-wrap gap-2 mt-1">
                  <span className="text-sky-400 font-bold">{result.shortest.entrance}</span>
                  <ArrowRight size={14} className="text-slate-600" />
                  
                  {result.shortest.wh_path?.map((whName, idx) => (
                    <React.Fragment key={idx}>
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                        {whName}
                      </span>
                      <ArrowRight size={14} className="text-slate-600" />
                    </React.Fragment>
                  ))}

                  <span className="text-sky-400 font-bold">{result.shortest.exit}</span>
                </div>
              )
            )}
          </div>

        </div>
      )}
    </div>
  );
};
