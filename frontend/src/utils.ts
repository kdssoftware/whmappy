// frontend/src/utils.ts
import type { Connection, Tag, System } from "./types";

export const TRADE_HUBS: Record<string, { id: number; color: string }> = {
  Jita: { id: 30000142, color: "#02add1" },
  Dodixie: { id: 30002659, color: "#37bb5c" },
  Amarr: { id: 30002187, color: "#e7b817" },
  Hek: { id: 30002053, color: "#fe3743" },
};

export const normalizeConnections = (raw: Connection[]): Connection[] => {
  const normalizedMap = raw.reduce(
    (acc: Record<string, Connection>, curr: Connection) => {
      const key = [curr.source_id, curr.target_id].sort().join("-");
      if (!acc[key]) acc[key] = curr;
      return acc;
    },
    {},
  );
  return Object.values(normalizedMap) as Connection[];
};

export const groupTagsBySystem = (tags: Tag[]): Record<number, Tag[]> => {
  return tags.reduce((acc: Record<number, Tag[]>, tag: Tag) => {
    if (!acc[tag.system_id]) acc[tag.system_id] = [];
    acc[tag.system_id].push(tag);
    return acc;
  }, {});
};

export const getJSpaceRoots = (
  connections: Connection[],
  pinnedSystems: System[] = [],
) => {
  const nodes = connections
    .flatMap((c) => [
      { id: c.source_id, name: c.source_name },
      { id: c.target_id, name: c.target_name },
    ])
    .filter((sys) => sys.id >= 31000000);

  const unique = new Map<number, System>();
  nodes.forEach((n) =>
    unique.set(n.id, {
      id: n.id,
      name: n.name,
      is_wormhole: true,
      security_status: -1,
      is_pinned: false,
    }),
  );

  pinnedSystems.forEach((ps) => {
    if (ps.id >= 31000000) {
      unique.set(ps.id, { ...unique.get(ps.id), ...ps, is_pinned: true });
    }
  });

  return Array.from(unique.values());
};

export function isWormholeSystem(systemID: number): boolean {
  // Wormhole IDs start with 31000000
  return systemID >= 31000000 && systemID < 32000000;
}

export function getKSpaceExits(
  startId: number,
  connections: Connection[],
): number[] {
  const exits: number[] = [];
  const queue = [startId];
  const visited = new Set<number>([startId]);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr < 31000000 && curr !== startId) {
      exits.push(curr);
      continue;
    }

    const neighbors = connections
      .filter((c) => c.source_id === curr || c.target_id === curr)
      .map((c) => (c.source_id === curr ? c.target_id : c.source_id));

    for (const n of neighbors) {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  return exits;
}

export function getHexFromSecurityStatus(securityStatus: number) {
  if (securityStatus >= 1) return HH;
  if (securityStatus >= 0.8) return HHM;
  if (securityStatus >= 0.7) return HHL;
  if (securityStatus >= 0.6) return HM;
  if (securityStatus >= 0.5) return HL;
  if (securityStatus >= 0.4) return LH;
  if (securityStatus >= 0.2) return LM;
  if (securityStatus >= 0) return LL;
  if (securityStatus >= -0.5) return NH;
  if (securityStatus < -0.5) return NL;
}

const HH = "#2f74e0";
const HHM = "#3b9cee";
const HHL = "#4ccef6";
const HM = "#61daa6";
const HL = "#f8ff88";
const LH = "#e0690f";
const LM = "#d0450c";
const LL = "#bc1112";
const NH = "#6e2025";
const NL = "#8f3069";
