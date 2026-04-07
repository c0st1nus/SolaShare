import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  SystemProgram,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { env } from "../../config/env";
import { payerKeypair } from "./config";
import { resolveTokenProgramForMint } from "./token-program";

const MOCK_USDC_DECIMALS = 6;
const MOCK_USDC_INITIAL_BALANCE = 10_000 * 1_000_000;
let mockUsdcMintPromise: Promise<{ mint: PublicKey; tokenProgram: PublicKey }> | null = null;

async function ensureMockUsdcMint(connection: Connection): Promise<{
  mint: PublicKey;
  tokenProgram: PublicKey;
}> {
  if (!payerKeypair) {
    throw new Error("SOLANA_PAYER_KEY is required to create a mock USDC mint");
  }

  if (mockUsdcMintPromise) {
    return mockUsdcMintPromise;
  }

  const payer = payerKeypair;

  mockUsdcMintPromise = (async () => {
    if (env.SOLANA_USDC_MINT_ADDRESS) {
      try {
        const existingMint = new PublicKey(env.SOLANA_USDC_MINT_ADDRESS);
        const tokenProgram = await resolveTokenProgramForMint(existingMint, "USDC", connection);

        return {
          mint: existingMint,
          tokenProgram,
        };
      } catch (error) {
        console.warn("Configured mock USDC mint is missing or stale, creating a new one.", error);
      }
    }

    const mint = await createMint(connection, payer, payer.publicKey, null, MOCK_USDC_DECIMALS);

    Object.assign(env, {
      SOLANA_USDC_MINT_ADDRESS: mint.toBase58(),
    });

    console.warn(
      `Created new mock USDC mint for localnet: ${mint.toBase58()}. Persist SOLANA_USDC_MINT_ADDRESS in .env if you want it to survive restart.`,
    );

    return {
      mint,
      tokenProgram: TOKEN_PROGRAM_ID,
    };
  })();

  return mockUsdcMintPromise;
}

export async function fundTestWalletInLocalnet(walletAddress: string) {
  if (process.env.NODE_ENV === "production" || !payerKeypair) {
    return;
  }

  try {
    const connection = new Connection(env.SOLANA_RPC_URL || "http://127.0.0.1:8899", "confirmed");
    const userWallet = new PublicKey(walletAddress);
    const { mint: usdcMint, tokenProgram } = await ensureMockUsdcMint(connection);

    const transferTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payerKeypair.publicKey,
        toPubkey: userWallet,
        lamports: 0.05 * 1e9,
      }),
    );
    await sendAndConfirmTransaction(connection, transferTx, [payerKeypair]);

    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      usdcMint,
      userWallet,
      false,
      "confirmed",
      undefined,
      tokenProgram,
    );

    await mintTo(
      connection,
      payerKeypair,
      usdcMint,
      ata.address,
      payerKeypair,
      MOCK_USDC_INITIAL_BALANCE,
      undefined,
      undefined,
      tokenProgram,
    );

    console.log(`✅ Funded test wallet ${walletAddress} with 10k USDC`);
  } catch (error) {
    console.error("Failed to fund test wallet:", error);
  }
}
