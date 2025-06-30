/*
 * Copyright (C) 2025 Cartoway
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faCar,
  faBicycle,
  faPersonWalking,
  faBus,
  faTruck,
  faMapPin,
  faXmark,
  faRoute,
  faLocationDot,
  faMapLocationDot,
  faSpinner,
  faEye,
  faEyeSlash,
  faClock,
  faRuler,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';

// Add all icons to the library
library.add(
  faCar,
  faBicycle,
  faPersonWalking,
  faBus,
  faTruck,
  faMapPin,
  faXmark,
  faRoute,
  faLocationDot,
  faMapLocationDot,
  faSpinner,
  faEye,
  faEyeSlash,
  faClock,
  faRuler,
  faArrowRight
);

// Export commonly used icons for easy access
export const icons = {
  car: faCar,
  bicycle: faBicycle,
  pedestrian: faPersonWalking,
  bus: faBus,
  truck: faTruck,
  mapPin: faMapPin,
  xmark: faXmark,
  route: faRoute,
  locationDot: faLocationDot,
  mapLocationDot: faMapLocationDot,
  spinner: faSpinner,
  eye: faEye,
  eyeSlash: faEyeSlash,
  clock: faClock,
  ruler: faRuler,
  arrowRight: faArrowRight
};
