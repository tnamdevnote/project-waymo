// Public API. Not a client module itself, so server components can use the dotted parts;
// each part is its own client component.
import { Camera } from "./map/Camera";
import { City } from "./map/City";
import { FireTruck } from "./map/FireTruck";
import { PassArrows } from "./map/PassArrows";
import { Route } from "./map/Route";
import { Traffic } from "./map/Traffic";
import { Vehicle } from "./map/Vehicle";
import { Viewport } from "./map/Viewport";
import { Arrival } from "./arrival/ArrivalPill";
import { CabinScreenRoot } from "./CabinScreenRoot";
import { Diagnosis } from "./diagnosis/Diagnosis";
import { RideMenu } from "./menu-bar/RideMenu";
import { Pass } from "./pass/Pass";
import { Reroute } from "./reroute/Reroute";
import { Reset } from "./reset/ResetButton";
import { StartRide } from "./start-ride/StartRide";
import { Support } from "./support/Support";
import { VehicleThought } from "./thinking-bubble/VehicleThought";

export const CabinScreen = {
  Root: CabinScreenRoot,
  StartRide,
  RideMenu,
  Arrival,
  VehicleThought,
  Diagnosis,
  Pass,
  Reroute,
  Support,
  Reset,
};
export const CabinMap = {
  Viewport,
  City,
  FireTruck,
  Traffic,
  Route,
  PassArrows,
  Vehicle,
  Camera,
};

export { useCabinScreen } from "./CabinScreenRoot";
export type {
  CabinAnchor,
  CabinLive,
  CabinScreenActions,
  CabinScreenContextValue,
  CabinScreenAnchors,
  CabinScreenRootProps,
  CabinScreenState,
  DiagnosisStage,
  PassState,
  PassWay,
  RerouteStage,
  RidePhase,
  RideScenario,
  SupportStage,
} from "./CabinScreenRoot";
export { TroubleshootSheet } from "./troubleshoot/TroubleshootSheet";
export type {
  LostReason,
  RideIssue,
  StuckReason,
  TroubleshootSheetProps,
} from "./troubleshoot/TroubleshootSheet";
export type { DiagnosisProps } from "./diagnosis/Diagnosis";
export type { PassProps } from "./pass/Pass";
export type { RerouteProps } from "./reroute/Reroute";
export type { SupportProps } from "./support/Support";
export type { ArrivalPillProps } from "./arrival/ArrivalPill";
export type { RideMenuProps } from "./menu-bar/RideMenu";
export type { StartRideProps } from "./start-ride/StartRide";
export type { Motion } from "./sim";
export { ThinkingBubble } from "./thinking-bubble/ThinkingBubble";
export type {
  ThinkingBubbleContentProps,
  ThinkingBubbleGlyphProps,
  ThinkingBubbleProps,
} from "./thinking-bubble/ThinkingBubble";
export type { VehicleThoughtProps } from "./thinking-bubble/VehicleThought";
export { ThoughtIcon } from "./thinking-bubble/ThoughtIcon";
export type { Thought, ThoughtIconProps } from "./thinking-bubble/ThoughtIcon";
