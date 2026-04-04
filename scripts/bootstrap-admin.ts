import { closeDatabaseConnection } from "../src/db";
import { ApiError } from "../src/lib/api-error";
import { bootstrapPasswordAdmin } from "../src/modules/auth/bootstrap";

const parseArguments = (argv: string[]) => {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (!value.startsWith("--")) {
      continue;
    }

    const key = value.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    args.set(key, next);
    index += 1;
  }

  return {
    email: args.get("email") ?? "",
    password: args.get("password") ?? "",
    displayName: args.get("display-name") ?? "Platform Admin",
  };
};

const printUsage = () => {
  console.log(
    "Usage: bun run bootstrap:admin --email admin@example.com --password 'StrongPassword123!' [--display-name 'Platform Admin']",
  );
};

const main = async () => {
  try {
    const { email, password, displayName } = parseArguments(Bun.argv.slice(2));

    if (!email || !password) {
      printUsage();
      process.exitCode = 1;
      return;
    }

    const result = await bootstrapPasswordAdmin({
      email,
      password,
      displayName,
    });

    console.log(
      JSON.stringify(
        {
          success: true,
          user_id: result.userId,
          email: result.email,
          role: result.role,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`${error.code}: ${error.message}`);
      process.exitCode = 1;
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  } finally {
    await closeDatabaseConnection();
  }
};

await main();
