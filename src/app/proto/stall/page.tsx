// PROTOTYPE (stall): throwaway route. Delete this folder once a variant is picked.
import { Suspense } from "react";
import { StallProto } from "./Proto";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; s?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <StallProto searchParams={searchParams} />
    </Suspense>
  );
}
