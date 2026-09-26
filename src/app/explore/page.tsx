import { Suspense } from "react";
import { SearchView } from "@/components/explorer/search-view";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading exploration…</p>}>
      <SearchView />
    </Suspense>
  );
}
