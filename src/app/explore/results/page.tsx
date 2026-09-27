import { Suspense } from "react";
import { ResultsView } from "@/components/explorer/results-view";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading results…</p>}>
      <ResultsView />
    </Suspense>
  );
}
