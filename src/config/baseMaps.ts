export interface BaseMapOption {
  id: string;
  url: string;
  labelKey: string;
}

export const BASE_MAP_OPTIONS: BaseMapOption[] = [
  {
    id: 'osm',
    url: 'https://maps.cartoway.com/styles/osm-openmaptiles-gl-style/style.json',
    labelKey: 'map.baseMap.osm',
  },
];
