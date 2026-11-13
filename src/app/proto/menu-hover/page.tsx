// PROTOTYPE (menu-hover): throwaway route. Delete this folder once a variant is picked.
import { Suspense } from "react";
import { MenuHoverProto } from "./Proto";

export default function Page({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  return (
    <Suspense fallback={null}>
      <MenuHoverProto searchParams={searchParams} />
    </Suspense>
  );
}
