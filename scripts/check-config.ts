import nextEnv from "@next/env";
import { integrationStatus, config } from "../src/server/config";
nextEnv.loadEnvConfig(process.cwd());
console.log(
  JSON.stringify(
    {
      origin: config().origin,
      configured: integrationStatus(),
      note: "Presence checks only; credentials and provider access have not been verified. Secret values are never printed.",
    },
    null,
    2,
  ),
);
