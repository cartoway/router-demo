interface BaseMapOption {
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
  {
    id: 'bicycle',
    url: 'https://vecto.teritorio.xyz/styles/teritorio-bicycle-latest/style.json?key=cartoway-router-demo-1-xahgaipob0ea7IBi4ahkie',
    labelKey: 'map.baseMap.bicycle',
  },
];
