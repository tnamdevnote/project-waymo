import { CabinMap, CabinScreen } from "@/components/features/cabin-screen";

export default function Home() {
  return (
    <main className="h-dvh w-full">
      <CabinScreen.Root defaultPhase="boarding" className="size-full">
        <CabinMap.Viewport>
          <CabinMap.City />
          <CabinMap.Traffic />
          <CabinMap.Route />
          <CabinMap.Vehicle />
          <CabinMap.Camera />
        </CabinMap.Viewport>
        <CabinScreen.StartRide rider="Taek Been" destination="2105 Comal St" />
      </CabinScreen.Root>
    </main>
  );
}
