import Landing from "@/components/landing";
export default function Home() {
  const revision =
    process.env.SOURCE_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "";
  const commitSha = /^[a-f0-9]{40}$/i.test(revision) ? revision : undefined;
  return <Landing commitSha={commitSha} />;
}
