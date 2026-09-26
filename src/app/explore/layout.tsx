import { ExplorerShell } from "@/components/explorer/shell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ExplorerShell>{children}</ExplorerShell>;
}
