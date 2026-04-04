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
  SectionHeader,
  StatusNotice,
  SurfaceCard,
  TextArea,
  TextInput,
} from "@/components/site";
import { linkWallet } from "@/lib/api";
import { executeWithSession, useStoredSession } from "@/lib/session";

export default function WalletBindingPage() {
  const router = useRouter();
  const { ready, session } = useStoredSession();
  const [formState, setFormState] = useState({
    wallet_address: "",
    signed_message: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      try {
        setErrorMessage(null);
        const result = await executeWithSession((token) => linkWallet(token, formState));
        if (result.success) {
          setSuccessMessage(
            "Wallet binding request stored. Confirm the transaction signature next.",
          );
          router.push("/auth/wallet/check");
        }
      } catch (error) {
        setSuccessMessage(null);
        setErrorMessage(error instanceof Error ? error.message : "Wallet binding failed.");
      }
    });
  };

  if (!ready) {
    return (
      <AuthShell label="Wallet setup">
        <LoadingState title="Loading session" description="Checking your authenticated session." />
      </AuthShell>
    );
  }

  if (!session) {
    return (
      <AuthShell label="Wallet setup">
        <EmptyState
          title="Sign in before linking a wallet"
          description="Wallet binding is an authenticated action. Create an account or sign in first."
          actions={
            <>
              <PageActionLink href="/auth/login">Sign in</PageActionLink>
              <PageActionLink href="/auth/register" tone="secondary">
                Create account
              </PageActionLink>
            </>
          }
          icon={<Icon name="wallet" className="size-5" />}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell label="Wallet setup">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <SectionHeader
            eyebrow="Link operating wallet"
            title="Attach the wallet that will be used for portfolio actions."
            description="The backend stores this as a pending wallet binding first. After you submit the signed message, the transaction confirmation screen finalizes the binding."
          />
          <SurfaceCard className="space-y-4">
            <p className="eyebrow">Current account</p>
            <div className="grid gap-3 text-sm leading-6 text-ink-soft">
              <p>
                Signed in as{" "}
                <span className="font-semibold text-ink">{session.user.display_name}</span>
              </p>
              <p>Role: {session.user.role}</p>
              <p>Providers: {session.user.auth_providers.join(", ")}</p>
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          {successMessage ? (
            <StatusNotice title="Binding created" tone="success">
              {successMessage}
            </StatusNotice>
          ) : null}
          {errorMessage ? (
            <StatusNotice title="Could not link wallet" tone="danger">
              {errorMessage}
            </StatusNotice>
          ) : null}
          <SurfaceCard className="space-y-6">
            <div className="space-y-2">
              <p className="eyebrow">Pending wallet binding</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
                Submit address and signed message
              </h2>
            </div>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <FormField label="Wallet address">
                <TextInput
                  type="text"
                  placeholder="Wallet public key"
                  value={formState.wallet_address}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      wallet_address: event.target.value,
                    }))
                  }
                  required
                />
              </FormField>
              <FormField
                label="Signed message"
                hint="This message should come from the selected wallet after the user approves the signature."
              >
                <TextArea
                  placeholder="Paste the signed message payload"
                  value={formState.signed_message}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      signed_message: event.target.value,
                    }))
                  }
                  required
                />
              </FormField>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={isPending}>
                  <Icon name="wallet" className="size-4" />
                  {isPending ? "Submitting…" : "Submit wallet binding"}
                </Button>
                <PageActionLink href="/dashboard" tone="secondary">
                  Back to dashboard
                </PageActionLink>
              </div>
            </form>
          </SurfaceCard>
        </div>
      </div>
    </AuthShell>
  );
}
