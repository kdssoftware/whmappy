// frontend/src/utils.ts
import type { Connection, Tag, System } from './types';

export const TRADE_HUBS : Record<string,string> = {
    "Jita": "#02add1", // Jita
    "Dodixie": "#37bb5c", // Dodixie
    "Amarr": "#e7b817", // Amarr
    "Hek": "#fe3743", // Hek
}

export const normalizeConnections = (raw: Connection[]): Connection[] => {
  const normalizedMap = raw.reduce((acc: Record<string, Connection>, curr: Connection) => {
    const key =[curr.source_id, curr.target_id].sort().join('-');
    if (!acc[key]) acc[key] = curr;
    return acc;
  }, {});
  return Object.values(normalizedMap) as Connection[];
};

export const groupTagsBySystem = (tags: Tag[]): Record<number, Tag[]> => {
  return tags.reduce((acc: Record<number, Tag[]>, tag: Tag) => {
    if (!acc[tag.system_id]) acc[tag.system_id] = [];
    acc[tag.system_id].push(tag);
    return acc;
  }, {});
};

export const getJSpaceRoots = (connections: Connection[], pinnedSystems: System[] =[]) => {
  const nodes = connections.flatMap(c =>[
    { id: c.source_id, name: c.source_name },
    { id: c.target_id, name: c.target_name }
  ]).filter(sys => sys.id >= 31000000);

  const unique = new Map<number, System>();
  nodes.forEach(n => unique.set(n.id, { id: n.id, name: n.name, is_wormhole: true, security_status: -1, is_pinned: false }));
  
  pinnedSystems.forEach(ps => {
      if (ps.id >= 31000000) {
          unique.set(ps.id, { ...unique.get(ps.id), ...ps, is_pinned: true });
      }
  });

  return Array.from(unique.values()).sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return a.name.localeCompare(b.name);
  });
};
