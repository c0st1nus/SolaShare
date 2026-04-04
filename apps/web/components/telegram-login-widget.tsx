"use client";

import { useEffect, useEffectEvent, useId, useRef } from "react";
import type { TelegramLoginRequest } from "@/lib/types";

type TelegramWidgetWindow = Window &
  Record<string, ((user: TelegramLoginRequest) => void | Promise<void>) | undefined>;

export function TelegramLoginWidget({
  onAuthenticate,
  onError,
  className,
}: {
  onAuthenticate: (user: TelegramLoginRequest) => Promise<void> | void;
  onError?: (message: string) => void;
  className?: string;
}) {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbackId = useId().replace(/:/g, "_");
  const handleAuthenticate = useEffectEvent(onAuthenticate);
  const handleError = useEffectEvent(onError ?? (() => undefined));

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !botUsername) {
      return;
    }

    const callbackName = `__solashareTelegramAuth_${callbackId}`;
    const telegramWindow = window as unknown as TelegramWidgetWindow;

    telegramWindow[callbackName] = async (user) => {
      try {
        await handleAuthenticate(user);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Telegram sign-in failed.";
        handleError(message);
      }
    };

    container.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "999");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-onauth", `${callbackName}(user)`);
    container.append(script);

    return () => {
      delete telegramWindow[callbackName];
      container.innerHTML = "";
    };
  }, [botUsername, callbackId]);

  if (!botUsername) {
    return null;
  }

  return <div className={className} ref={containerRef} />;
}
