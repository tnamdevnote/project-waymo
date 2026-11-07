import { CabinMap, CabinScreen } from "@/components/features/cabin-screen";

export default function Home() {
  return (
    <main className="h-dvh w-full">
      <CabinScreen.Root defaultDriving className="size-full">
        <CabinMap.Viewport>
          <CabinMap.City />
          <CabinMap.Traffic />
          <CabinMap.Route />
          <CabinMap.Vehicle />
          <CabinMap.Camera />
        </CabinMap.Viewport>
      </CabinScreen.Root>
    </main>
  );
}
