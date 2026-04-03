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
  switch (Number(securityStatus.toFixed(1))) {
    case 1:
      return color["Crayola Blue"];
    case 0.9:
      return color["Blue Bell"];
    case 0.8:
      return color["Blue Bell"];
    case 0.7:
      return color["Sky Aqua"];
    case 0.6:
      return color["Emerald"];
    case 0.5:
      return color["Lime Cream"];
    case 0.4:
      return color["Autumn Leaf"];
    case 0.3:
      return color["Spicy Orange"];
    case 0.2:
      return color["Spicy Orange"];
    case 0.1:
      return color["Brick Ember"];
    case 0:
      return color["Brick Ember"];
    case -0.2:
      return color["Wine Plum"];
    case -0.3:
      return color["Wine Plum"];
    case -0.4:
      return color["Wine Plum"];
    case -0.5:
      return color["Wine Plum"];
    case -0.6:
      return color["Berry Blush"];
    case -0.7:
      return color["Berry Blush"];
    case -0.8:
      return color["Berry Blush"];
    case -0.9:
      return color["Berry Blush"];
    case -1:
      return color["Berry Blush"];
  }
}

// https://coolors.co/2f74e0-3b9cee-4ccef6-61daa6-f8ff88-e0690f-d0450c-bc1112-6e2025-8f3069
const color = {
  "Crayola Blue": "#2f74e0",
  "Blue Bell": "#3b9cee",
  "Sky Aqua": "#4ccef6",
  Emerald: "#61DAA6",
  "Lime Cream": "#F8FF88",
  "Autumn Leaf": "#E0690F",
  "Spicy Orange": "#D0450C",
  "Brick Ember": "#BC1112",
  "Wine Plum": "#6E2025",
  "Berry Blush": "#8F3069",
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
