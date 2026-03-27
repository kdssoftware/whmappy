// frontend/src/types.ts
export interface EveUser {
  id: number;
  name: string;
}

export interface HubRoute {
  hub_name: string;
  total_jumps: number;
  total_safe_jumps?: number;
  exit_system: string;
  safe_exit_system?: string;
}

export type System = {
  id: number;
  name: string;
  is_wormhole: boolean;
  security_status: number;
  is_pinned?: boolean;
}

export type Connection = {
  id: string;
  source_id: number;
  target_id: number;
  type: 'wormhole' | 'gate';
  wh_size: string;
  custom_name?: string;
  expires_at: string; // ISO String
  target_name: string;
  source_name: string;
}

export interface MapNode extends System {
  connections: Connection[];
}

export type Tag = {
  id: number;
  system_id: number;
  tag_name: string;
}

export type RouteCalculationResult = {
  shortest: {
    total_jumps: number;
    route_type: string;
    entrance?: string;
    exit?: string;
    wh_path?: string[];
  };
  secure: {
    total_jumps: number;
    route_type: string;
    entrance?: string;
    exit?: string;
    wh_path?: string[];
  };
};
