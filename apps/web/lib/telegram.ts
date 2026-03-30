declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
      };
    };
  }
}

export function getTelegramMiniAppInitData(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const initData = window.Telegram?.WebApp?.initData?.trim();
  return initData ? initData : null;
}

export function isTelegramMiniApp(): boolean {
  return getTelegramMiniAppInitData() !== null;
}
