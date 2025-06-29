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
