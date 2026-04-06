import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { Connection, PublicKey } from "@solana/web3.js";
import { ApiError } from "../api-error";
import { connection as defaultConnection } from "./config";

export function isSupportedTokenProgram(programId: PublicKey): boolean {
  return programId.equals(TOKEN_PROGRAM_ID) || programId.equals(TOKEN_2022_PROGRAM_ID);
}

export function tokenProgramLabel(programId: PublicKey): "spl-token" | "spl-token-2022" {
  return programId.equals(TOKEN_2022_PROGRAM_ID) ? "spl-token-2022" : "spl-token";
}

export async function resolveTokenProgramForMint(
  mint: PublicKey,
  label: string,
  conn: Connection = defaultConnection,
): Promise<PublicKey> {
  const accountInfo = await conn.getAccountInfo(mint);

  if (!accountInfo) {
    throw new ApiError(409, "MINT_ACCOUNT_NOT_FOUND", `${label} mint does not exist on-chain`);
  }

  if (!isSupportedTokenProgram(accountInfo.owner)) {
    throw new ApiError(
      409,
      "UNSUPPORTED_TOKEN_PROGRAM",
      `${label} mint is owned by an unsupported token program: ${accountInfo.owner.toBase58()}`,
    );
  }

  return accountInfo.owner;
}
