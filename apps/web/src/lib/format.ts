export function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

