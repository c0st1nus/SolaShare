"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import {
  AuthShell,
  Button,
  EmptyState,
  FormField,
  LoadingState,
  PageActionLink,
  StatusNotice,
  SurfaceCard,
  TextInput,
} from "@/components/site";
import { confirmTransaction } from "@/lib/api";
import { executeWithSession, useStoredSession } from "@/lib/session";

const verificationStages = [
  "Capture the signed wallet message on the client.",
  "Store the pending wallet binding with the backend.",
  "Confirm the transaction signature so the binding becomes active.",
];

export default function WalletCheckPage() {
  const router = useRouter();
  const { ready, session } = useStoredSession();
  const [transactionSignature, setTransactionSignature] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      try {
        setErrorMessage(null);
        const result = await executeWithSession((token) =>
          confirmTransaction(token, {
            kind: "wallet_link",
            transaction_signature: transactionSignature,
          }),
        );

        if (result.success) {
          setSuccessMessage(
            "Wallet binding confirmed. You can continue into compliance or the dashboard.",
          );
          router.push("/auth/kyc");
        }
      } catch (error) {
        setSuccessMessage(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Transaction confirmation failed.",
        );
      }
    });
  };

  if (!ready) {
    return (
      <AuthShell label="Wallet confirmation">
        <LoadingState title="Loading session" description="Checking your authenticated session." />
      </AuthShell>
    );
  }

  if (!session) {
    return (
      <AuthShell label="Wallet confirmation">
        <EmptyState
          title="Sign in before confirming a wallet"
          description="The confirmation endpoint needs the same authenticated session used for wallet binding."
          actions={<PageActionLink href="/auth/login">Go to sign in</PageActionLink>}
          icon={<Icon name="wallet" className="size-5" />}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell label="Wallet confirmation">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {successMessage ? (
          <StatusNotice title="Wallet confirmed" tone="success">
            {successMessage}
          </StatusNotice>
        ) : null}
        {errorMessage ? (
          <StatusNotice title="Could not confirm wallet" tone="danger">
            {errorMessage}
          </StatusNotice>
        ) : null}
        <SurfaceCard className="space-y-8">
          <div className="mx-auto flex size-18 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-brand-mint),var(--color-brand-violet))] text-white shadow-float">
            <Icon name="wallet" className="size-8" />
          </div>
          <div className="space-y-2 text-center">
            <p className="eyebrow">Finalize wallet binding</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
              Confirm the wallet transaction
            </h1>
            <p className="mx-auto max-w-2xl text-sm leading-6 text-ink-soft">
              Submit the chain signature for the wallet-link transaction so the backend can mark the
              binding as active.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {verificationStages.map((stage, index) => (
              <div
                key={stage}
                className="rounded-shell border border-line/60 bg-surface-soft p-5 text-left"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-white text-brand shadow-soft">
                  <span className="text-sm font-semibold">{index + 1}</span>
                </div>
                <p className="text-sm leading-6 text-ink">{stage}</p>
              </div>
            ))}
          </div>
          <form className="grid gap-4" onSubmit={handleConfirm}>
            <FormField label="Transaction signature">
              <TextInput
                type="text"
                placeholder="Paste the confirmed transaction signature"
                value={transactionSignature}
                onChange={(event) => setTransactionSignature(event.target.value)}
                required
              />
            </FormField>
            <div className="flex flex-wrap justify-center gap-3">
              <Button type="submit" disabled={isPending}>
                <Icon name="check" className="size-4" />
                {isPending ? "Confirming…" : "Confirm wallet"}
              </Button>
              <PageActionLink href="/dashboard" tone="secondary">
                Skip to dashboard
              </PageActionLink>
            </div>
          </form>
        </SurfaceCard>
      </div>
    </AuthShell>
  );
}
