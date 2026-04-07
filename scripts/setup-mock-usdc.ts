#!/usr/bin/env bun
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  SystemProgram,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { env } from "../apps/api/src/config/env";
import { payerKeypair } from "../apps/api/src/lib/solana/config";
import { resolveTokenProgramForMint } from "../apps/api/src/lib/solana/token-program";

const rpcUrl = env.SOLANA_RPC_URL || "http://127.0.0.1:8899";
const connection = new Connection(rpcUrl, "confirmed");

async function main() {
  if (!payerKeypair) {
    console.error("❌ SOLANA_PAYER_KEY is not set in your .env");
    console.error("Please set it to a valid base64 or JSON array keypair.");
    process.exit(1);
  }

  const walletArg = process.argv[2];

  console.log(`🔌 Connected to ${rpcUrl}`);
  console.log(`🏦 Payer: ${payerKeypair.publicKey.toBase58()}`);

  const balance = await connection.getBalance(payerKeypair.publicKey);
  if (balance < 1e9) {
    console.log("💧 Payer balance is low, requesting airdrop of 2 SOL...");
    const sig = await connection.requestAirdrop(payerKeypair.publicKey, 2e9);
    await connection.confirmTransaction(sig, "confirmed");
  }

  let usdcMint: PublicKey;

  if (env.SOLANA_USDC_MINT_ADDRESS) {
    usdcMint = new PublicKey(env.SOLANA_USDC_MINT_ADDRESS);
    console.log(`🪙 Found existing Mock USDC Mint: ${usdcMint.toBase58()}`);
  } else {
    console.log("🪙 Creating new Mock USDC Mint...");
    usdcMint = await createMint(
      connection,
      payerKeypair,
      payerKeypair.publicKey,
      null,
      6, // 6 decimals for USDC
    );
    console.log(`✅ Created Mock USDC Mint: ${usdcMint.toBase58()}`);
    console.log("\n⚠️ IMPORTANT: Add this to your .env file:");
    console.log(`SOLANA_USDC_MINT_ADDRESS=${usdcMint.toBase58()}\n`);
  }

  const tokenProgram = await resolveTokenProgramForMint(usdcMint, "USDC", connection);

  if (walletArg) {
    const userWallet = new PublicKey(walletArg);
    console.log(`\n💳 Funding user wallet: ${userWallet.toBase58()}...`);

    // Give them some SOL for rent/gas
    const transferTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payerKeypair.publicKey,
        toPubkey: userWallet,
        lamports: 0.1 * 1e9,
      }),
    );
    await sendAndConfirmTransaction(connection, transferTx, [payerKeypair]);
    console.log("✅ Sent 0.1 SOL for gas");

    // Give them 10,000 Mock USDC
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
      10_000 * 1_000_000, // 10k USDC
      undefined,
      undefined,
      tokenProgram,
    );
    console.log(`✅ Minted 10,000 Mock USDC to ${ata.address.toBase58()}`);
  }

  console.log("\n🎉 Setup complete!");
}

main().catch(console.error);
