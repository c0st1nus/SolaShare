import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";

app.listen(env.PORT);

logger.info(
  {
    port: env.PORT,
    openapiPath: "/openapi",
    apiBasePath: "/api/v1",
  },
  `SolaShare backend is running at 0.0.0.0:${env.PORT}`,
);
