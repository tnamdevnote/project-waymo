// Public API. Not a client module itself, so server components can use the dotted parts;
// each part is its own client component.
import { Camera } from "./map/Camera";
import { City } from "./map/City";
import { Route } from "./map/Route";
import { Traffic } from "./map/Traffic";
import { Vehicle } from "./map/Vehicle";
import { Viewport } from "./map/Viewport";
import { CabinScreenRoot } from "./CabinScreenRoot";
import { StartRide } from "./start-ride/StartRide";

export const CabinScreen = { Root: CabinScreenRoot, StartRide };
export const CabinMap = { Viewport, City, Traffic, Route, Vehicle, Camera };

export { useCabinScreen } from "./CabinScreenRoot";
export type {
  CabinLive,
  CabinScreenActions,
  CabinScreenContextValue,
  CabinScreenRootProps,
  CabinScreenState,
  RidePhase,
} from "./CabinScreenRoot";
export type { StartRideProps } from "./start-ride/StartRide";
export { SupportButton } from "./SupportButton";
export type { Motion } from "./sim";
