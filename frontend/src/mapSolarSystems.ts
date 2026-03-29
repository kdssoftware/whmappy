export type MapSolarSystems = MapSolarSystem[];

export type MapSolarSystem = {
  _key: number;
  border?: boolean;
  constellationID: number;
  hub?: boolean;
  international?: boolean;
  luminosity?: number;
  name: Name;
  planetIDs?: number[];
  position: Position;
  position2D?: Position2D;
  radius: number;
  regionID: number;
  regional?: boolean;
  securityClass?: string;
  securityStatus: number;
  starID?: number;
  stargateIDs?: number[];
  corridor?: boolean;
  fringe?: boolean;
  wormholeClassID?: number;
  visualEffect?: string;
  disallowedAnchorCategories?: number[];
  disallowedAnchorGroups?: number[];
  factionID?: number;
};

type Name = {
  de?: string;
  en: string;
  es?: string;
  fr?: string;
  ja?: string;
  ko?: string;
  ru?: string;
  zh?: string;
};

type Position = {
  x: number;
  y: number;
  z: number;
};

type Position2D = {
  x: number;
  y: number;
};

import data from "./mapSolarSystems.json";

const mapSolarSystems = data as unknown as MapSolarSystems;

export function getSolarSystem(id: number): MapSolarSystem | undefined {
  return mapSolarSystems.find((system) => system._key === id);
}
