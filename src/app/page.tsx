import { CabinMap, CabinScreen } from "@/components/features/cabin-screen";

export default function Home() {
  return (
    <main className="h-dvh w-full">
      <CabinScreen.Root defaultPhase="boarding" className="size-full">
        <CabinMap.Viewport>
          <CabinMap.City />
          <CabinMap.Cones />
          <CabinMap.Traffic />
          <CabinMap.Route />
          <CabinMap.Obstruction />
          <CabinMap.Vehicle />
          <CabinMap.Camera />
        </CabinMap.Viewport>
        <CabinScreen.Diagnosis />
        <CabinScreen.Reroute />
        <CabinScreen.Support />
        <CabinScreen.VehicleThought />
        <CabinScreen.RideMenu />
        <CabinScreen.Reset />
        <CabinScreen.StartRide rider="Taek Been" destination="2105 Comal St" />
      </CabinScreen.Root>
    </main>
  );
}
