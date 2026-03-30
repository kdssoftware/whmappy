// frontend/src/anoik.ts

export interface Anoik {
  constellations: Constellations;
  effects: Effects;
  version: number;
  wormholes: Wormholes;
  celestialtypes: Celestialtypes;
  wormholeclasses: Wormholeclasses;
  roman: string[];
  systems: Systems;
  regions: Regions;
}

export type Constellations = {
  [key in string]: string;
};

export interface Effects {
  "Red Giant": RedGiant;
  "Black Hole": BlackHole;
  "Cataclysmic Variable": CataclysmicVariable;
  Pulsar: Pulsar;
  Magnetar: Magnetar;
  "Wolf-Rayet Star": WolfRayetStar;
}

export interface RedGiant {
  "Smart Bomb Damage": string[];
  "Heat Damage": string[];
  "Overload Bonus": string[];
  "Bomb Damage": string[];
  "Smart Bomb Range": string[];
}

export interface BlackHole {
  "Missile Velocity": string[];
  "Stasis Webifier Strength": string[];
  Inertia: string[];
  "Ship Velocity": string[];
  "Missile Explosion Velocity": string[];
  "Targeting Range": string[];
}

export interface CataclysmicVariable {
  "Remote Cap Transmitter Amount": string[];
  "Capacitor Recharge Time": string[];
  "Capacitor Capacity": string[];
  "Remote Armor Repair Amount": string[];
  "Local Armor Repair Amount": string[];
  "Local Shield Repair Amount": string[];
  "Shield Transfer Amount": string[];
}

export interface Pulsar {
  "Armor Resists": string[];
  "Shield Capacity": string[];
  "Capacitor Recharge Time": string[];
  "Signature Radius": string[];
  "NOS & Neut Drain Amount": string[];
}

export interface Magnetar {
  "Drone Tracking": string[];
  "Tracking Speed": string[];
  "Target Painter Strength": string[];
  Damage: string[];
  "Targeting Range": string[];
  "Missile Explosion Radius": string[];
}

export interface WolfRayetStar {
  "Small Weapon Damage": string[];
  "Armor HP": string[];
  "Shield Resist": string[];
  "Signature Radius": string[];
}

export type Wormholes = {
  [key in string]: SysInfo;
};

export interface SysInfo {
  mass_regen: number;
  dest: string;
  src: string[];
  static: boolean;
  max_mass_per_jump: number;
  lifetime: number;
  total_mass: number;
  sibling_groups: string[][];
  typeID: number;
}

export type Celestialtypes = {
  [key in string]: CelInfo;
};

export interface CelInfo {
  color: string;
  groupID: number;
  typeName: string;
}

export type Wormholeclasses = {
  [key in string]: ClassInfo;
};

export interface ClassInfo {
  wormholeClassID: number;
  color: string;
  effectPower: number;
  title: string;
}

export type Systems = {
  [key in string]: Jinfo; // key example: J123456
};

export interface Jinfo {
  solarSystemID: number;
  regionID: number;
  effectName: string;
  statics: string[];
  constellationID: number;
  cels: number[][];
  wormholeClass: string;
  solarSystemName: string;
}

export type Regions = {
  [key in string]: string;
};
