import { Icon } from "@/components/icons";
import {
  AuthShell,
  HighlightStrip,
  PageActionLink,
  SectionHeader,
  SurfaceCard,
  TimelineList,
} from "@/components/site";

const kycChecklist = [
  "Government-issued identity document",
  "Proof of address for the operating entity or investor",
  "Sanctions and PEP screening signals",
  "Source-of-funds metadata for higher ticket allocations",
];

export default function KycPage() {
  return (
    <AuthShell label="Compliance review">
      <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <SectionHeader
            eyebrow="Operational note"
            title="KYC remains part of the onboarding story, but not yet a published MVP endpoint."
            description="The product flow still needs a compliance checkpoint, especially before larger allocations. The backend docs currently publish asset verification and admin controls, but not a dedicated end-user KYC route."
          />
          <TimelineList
            title="Current onboarding order"
            steps={[
              {
                title: "Authenticate with web or provider entry",
                detail:
                  "Issue the local session through password, Google, Telegram Login Widget, or Telegram Mini App init data.",
              },
              {
                title: "Bind an operating wallet",
                detail:
                  "Capture the signed wallet link request, then finalize the latest pending binding.",
              },
              {
                title: "Run compliance review",
                detail:
                  "Collect identity and sanctions data before enabling larger or restricted workflows.",
              },
            ]}
          />
        </div>

        <div className="space-y-6">
          <SurfaceCard className="space-y-6">
            <div className="space-y-2">
              <p className="eyebrow">Step 3</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
                Compliance checkpoint
              </h2>
              <p className="text-sm leading-6 text-ink-soft">
                This screen preserves the onboarding momentum from the HTML prototype while
                explicitly marking the current gap in the published backend contract.
              </p>
            </div>
            <div className="grid gap-3">
              {kycChecklist.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-3xl border border-line/60 bg-surface-soft px-4 py-4"
                >
                  <span className="mt-0.5 flex size-8 items-center justify-center rounded-2xl bg-white text-brand shadow-soft">
                    <Icon name="check" className="size-4" />
                  </span>
                  <p className="text-sm leading-6 text-ink">{item}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <PageActionLink href="/dashboard">
                Open investor dashboard
                <Icon name="arrow-right" className="size-4" />
              </PageActionLink>
              <PageActionLink href="/assets" tone="secondary">
                Browse public assets
              </PageActionLink>
            </div>
          </SurfaceCard>
          <HighlightStrip
            icon={<Icon name="lock" className="size-5" />}
            title="Published verification scope"
            body="The current API spec covers web auth, wallet binding, asset verification, investor portfolio views, and claim flows. User-KYC transport is still an implementation gap and should be called out explicitly rather than guessed."
          />
        </div>
      </div>
    </AuthShell>
  );
}
