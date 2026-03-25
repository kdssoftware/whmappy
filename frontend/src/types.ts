// frontend/src/types.ts
export type System ={
  id: number;
  name: string;
  is_wormhole: boolean;
  security_status: number;
}

export type Connection ={
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
