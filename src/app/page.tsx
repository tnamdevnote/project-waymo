import { CabinMap, CabinScreen } from "@/components/features/cabin-screen";

export default function Home() {
  return (
    <main className="h-dvh w-full">
      <CabinScreen.Root defaultPhase="boarding" className="size-full">
        <CabinMap.Viewport>
          <CabinMap.City />
          <CabinMap.FireTruck />
          <CabinMap.Traffic />
          <CabinMap.Route />
          <CabinMap.PathChoices />
          <CabinMap.Vehicle />
          <CabinMap.Camera />
        </CabinMap.Viewport>
        <CabinScreen.Diagnosis />
        <CabinScreen.Reroute />
        <CabinScreen.Support />
        <CabinScreen.VehicleThought />
        <CabinScreen.PathPick />
        <CabinScreen.TrafficReroute destination="Union Station" />
        <CabinScreen.Arrival minutes={10} at="3:30" />
        <CabinScreen.RideMenu />
        <CabinScreen.Reset />
        <CabinScreen.StartRide rider="Taek Been" destination="2105 Comal St" />
      </CabinScreen.Root>
    </main>
  );
}
