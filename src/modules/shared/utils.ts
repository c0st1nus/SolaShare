export const toNumber = (value: string | number | null | undefined) => Number(value ?? 0);

export const toMoneyString = (value: number) => value.toFixed(6);

export const toShareAmountString = (value: number) => value.toFixed(12);

export const roundMoney = (value: number) => Number(value.toFixed(6));

export const clampPercent = (value: number) => {
  if (value < 0) {
    return 0;
  }

  if (value > 100) {
    return 100;
  }

  return Number(value.toFixed(2));
};
