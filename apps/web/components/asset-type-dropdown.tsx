"use client";

import * as Select from "@radix-ui/react-select";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { EnergyType } from "@/lib/types";

type AssetTypeOption = {
  value: EnergyType;
  label: string;
  description: string;
  available: boolean;
};

const assetTypeOptions: AssetTypeOption[] = [
  {
    value: "solar",
    label: "Solar Panel",
    description: "Available now for asset creation.",
    available: true,
  },
  {
    value: "wind",
    label: "Wind Turbine",
    description: "Coming soon",
    available: false,
  },
  {
    value: "hydro",
    label: "Hydro Unit",
    description: "Coming soon",
    available: false,
  },
  {
    value: "ev_charging",
    label: "EV Charging",
    description: "Coming soon",
    available: false,
  },
  {
    value: "other",
    label: "Other Infrastructure",
    description: "Coming soon",
    available: false,
  },
];

function AssetTypeValue({ energyType }: { energyType: EnergyType }) {
  const selectedOption =
    assetTypeOptions.find((option) => option.value === energyType) ?? assetTypeOptions[0];

  return (
    <div>
      <p className="font-medium text-ink">{selectedOption.label}</p>
      <p className="mt-1 text-xs leading-5 text-ink-soft">{selectedOption.description}</p>
    </div>
  );
}

export function AssetTypeDropdown({
  value,
  onChange,
}: {
  value: EnergyType;
  onChange: (nextValue: EnergyType) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const openTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const syncViewportState = (event?: MediaQueryListEvent) => {
      setIsCompactViewport(event?.matches ?? mediaQuery.matches);
    };

    syncViewportState();
    mediaQuery.addEventListener("change", syncViewportState);

    return () => {
      mediaQuery.removeEventListener("change", syncViewportState);
      if (openTimerRef.current !== null) {
        window.clearTimeout(openTimerRef.current);
      }
    };
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (openTimerRef.current !== null) {
        window.clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
      setOpen(false);
      return;
    }

    if (isCompactViewport && triggerRef.current) {
      triggerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      if (openTimerRef.current !== null) {
        window.clearTimeout(openTimerRef.current);
      }

      openTimerRef.current = window.setTimeout(() => {
        setOpen(true);
        openTimerRef.current = null;
      }, 180);
      return;
    }

    setOpen(true);
  };

  return (
    <Select.Root
      open={open}
      onOpenChange={handleOpenChange}
      value={value}
      onValueChange={(nextValue) => onChange(nextValue as EnergyType)}
    >
      <Select.Trigger
        ref={triggerRef}
        className={cn(
          "input-shell flex items-center justify-between gap-4 text-left",
          "data-[placeholder]:text-ink-soft",
          "group",
        )}
        aria-label="Asset type"
      >
        <Select.Value>
          <AssetTypeValue energyType={value} />
        </Select.Value>
        <Select.Icon className="text-ink-soft transition-transform duration-200 group-data-[state=open]:rotate-180">
          <Icon name="chevron-right" className="size-4 rotate-90" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          side="bottom"
          align="start"
          sideOffset={10}
          avoidCollisions={false}
          collisionPadding={16}
          className={cn(
            "select-content-motion z-[70] w-[min(var(--radix-select-trigger-width),calc(100vw-2.5rem))] overflow-hidden rounded-[1.75rem] border border-line/70 bg-white shadow-float",
          )}
        >
          <Select.Viewport className="grid max-h-[min(32vh,16rem)] gap-3 overflow-y-auto overscroll-contain p-4 sm:max-h-[24rem] sm:gap-2 sm:p-3">
            {assetTypeOptions.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                disabled={!option.available}
                className={cn(
                  "relative rounded-[1.35rem] border px-4 py-3.5 outline-none transition",
                  "data-[state=checked]:border-brand-violet/40 data-[state=checked]:bg-white",
                  option.available
                    ? "border-line/60 bg-surface-soft text-ink hover:border-brand-violet/30 hover:bg-white"
                    : "cursor-not-allowed border-line/40 bg-surface-soft/80 text-ink-soft opacity-75",
                )}
              >
                <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div>
                    <Select.ItemText>
                      <p className="text-base font-medium sm:text-sm">{option.label}</p>
                    </Select.ItemText>
                    <p className="mt-1 text-xs leading-5">{option.description}</p>
                  </div>
                  {!option.available ? (
                    <span className="token-pill self-center whitespace-nowrap border-amber-200 bg-amber-50 text-amber-700 sm:self-auto">
                      Coming soon
                    </span>
                  ) : null}
                </div>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
