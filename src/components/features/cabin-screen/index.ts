// Public API. Not a client module itself, so server components can use the dotted parts;
// each part is its own client component.
import { Camera } from "./map/Camera";
import { City } from "./map/City";
import { Route } from "./map/Route";
import { Traffic } from "./map/Traffic";
import { Vehicle } from "./map/Vehicle";
import { Viewport } from "./map/Viewport";
import { CabinScreenRoot } from "./CabinScreenRoot";
import { RideMenu } from "./menu-bar/RideMenu";
import { StartRide } from "./start-ride/StartRide";
import { VehicleThought } from "./thinking-bubble/VehicleThought";

export const CabinScreen = { Root: CabinScreenRoot, StartRide, RideMenu, VehicleThought };
export const CabinMap = { Viewport, City, Traffic, Route, Vehicle, Camera };

export { useCabinScreen } from "./CabinScreenRoot";
export type {
  CabinAnchor,
  CabinLive,
  CabinScreenActions,
  CabinScreenContextValue,
  CabinScreenAnchors,
  CabinScreenRootProps,
  CabinScreenState,
  RidePhase,
} from "./CabinScreenRoot";
export { TroubleshootSheet } from "./troubleshoot/TroubleshootSheet";
export type { TroubleshootSheetProps } from "./troubleshoot/TroubleshootSheet";
export type { RideMenuProps } from "./menu-bar/RideMenu";
export type { StartRideProps } from "./start-ride/StartRide";
export type { Motion } from "./sim";
export { ThinkingBubble } from "./thinking-bubble/ThinkingBubble";
export type {
  ThinkingBubbleContentProps,
  ThinkingBubbleProps,
  TrafficLightProps,
  TrafficSignal,
} from "./thinking-bubble/ThinkingBubble";
export type { VehicleThoughtProps } from "./thinking-bubble/VehicleThought";
