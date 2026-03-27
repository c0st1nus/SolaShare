import { openapi } from "@elysiajs/openapi";
import { z } from "zod";

export const openApiPlugin = openapi({
  provider: "scalar",
  path: "/openapi",
  specPath: "/openapi/json",
  documentation: {
    info: {
      title: "SolaShare API",
      version: "0.1.0",
      description:
        "Skeleton REST API for the Solana-based RWA platform. Contracts are defined with Zod and handlers are stubbed while the service layer is being implemented.",
    },
    tags: [
      { name: "System", description: "Operational health and readiness endpoints" },
      { name: "Auth", description: "Authentication and wallet binding" },
      { name: "Assets", description: "Public asset discovery and detail endpoints" },
      { name: "Issuer", description: "Issuer asset management workflows" },
      { name: "Investor", description: "Investor read models and history" },
      { name: "Investments", description: "Investment quote and transaction preparation" },
      { name: "Claims", description: "Claim preparation workflows" },
      { name: "Transactions", description: "Transaction confirmation callbacks" },
      { name: "Admin", description: "Administrative moderation and audit endpoints" },
    ],
  },
  mapJsonSchema: {
    zod: z.toJSONSchema,
  },
});
