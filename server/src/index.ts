import "dotenv/config";
import { env } from "./config/env.js";
import { initPrisma, getPrisma } from "./db/client.js";
import app from "./app.js";

async function main(): Promise<void> {
  await initPrisma();
  const prisma = getPrisma();
  await prisma.$connect();

  const server = app.listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT}`);
  });

  const shutdown = (): void => {
    server.close(() => {
      getPrisma()
        .$disconnect()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
