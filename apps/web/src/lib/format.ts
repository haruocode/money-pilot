import type { AccountType } from "@money-pilot/shared";

export function formatMoney(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

const accountTypeLabels: Record<AccountType, string> = {
  Bank: "銀行口座",
  CreditCard: "クレジットカード",
  CardLoan: "カードローン",
  ConsumerLoan: "消費者ローン",
  Investment: "投資",
  Crypto: "暗号資産",
  Cash: "現金",
  Other: "その他",
};

export function formatAccountType(accountType: AccountType) {
  return accountTypeLabels[accountType];
}
