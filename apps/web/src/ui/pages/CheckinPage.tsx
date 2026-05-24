import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountCategory, AccountMaster, CreateSnapshotInput } from "@money-pilot/shared";
import { fetchAccounts, fetchSnapshot, saveSnapshot } from "../../lib/api";
import { formatMoney } from "../../lib/format";

const CATEGORY_LABELS: Record<AccountCategory, string> = {
  Bank: "銀行",
  CreditCard: "クレジットカード",
  CardLoan: "カードローン",
  ConsumerLoan: "消費者ローン",
  Investment: "証券・投資",
  Crypto: "暗号資産",
  Cash: "現金",
  Other: "その他",
};

function toYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function buildBalanceMap(
  accounts: AccountMaster[],
  savedBalances: { accountId: string; balance: number }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of accounts) {
    const saved = savedBalances.find((b) => b.accountId === a.id);
    map[a.id] = saved != null ? String(saved.balance) : "";
  }
  return map;
}

export function CheckinPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const yearMonth = toYearMonth(year, month);

  const queryClient = useQueryClient();

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const { data: snapshotData } = useQuery({
    queryKey: ["snapshot", yearMonth],
    queryFn: () => fetchSnapshot(yearMonth),
  });

  const accounts = accountsData?.accounts ?? [];
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (accounts.length === 0) return;
    const savedBalances = snapshotData?.snapshot?.balances ?? [];
    setBalances(buildBalanceMap(accounts, savedBalances));
    setSavedAt(snapshotData?.snapshot?.createdAt ?? null);
  }, [snapshotData, accounts.length]);

  const saveMutation = useMutation({
    mutationFn: saveSnapshot,
    onSuccess: (snapshot) => {
      queryClient.invalidateQueries({ queryKey: ["snapshot", yearMonth] });
      setSavedAt(snapshot.createdAt);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const balanceList = Object.entries(balances)
      .filter(([, v]) => v !== "")
      .map(([accountId, v]) => ({ accountId, balance: parseInt(v, 10) }))
      .filter(({ balance }) => !isNaN(balance));

    const input: CreateSnapshotInput = {
      snapshotDate: yearMonth,
      balances: balanceList,
    };
    saveMutation.mutate(input);
  }

  const assets = accounts.filter((a) => !a.isDebt);
  const debts = accounts.filter((a) => a.isDebt);

  const years = Array.from({ length: 11 }, (_, i) => now.getFullYear() - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="page">
      <div className="page-header">
        <h2>残高入力</h2>
        {savedAt && (
          <span className="muted" style={{ fontSize: 13 }}>
            最終保存: {new Date(savedAt).toLocaleString("ja-JP")}
          </span>
        )}
      </div>

      <div className="panel" style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div className="field" style={{ margin: 0 }}>
          <span>年</span>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: 100 }}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <span>月</span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            style={{ width: 80 }}
          >
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {accounts.length === 0 ? (
        <p className="muted">口座が登録されていません。先に「口座管理」から登録してください。</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="panel-stack">
            {assets.length > 0 && (
              <BalanceSection
                title="資産"
                accounts={assets}
                balances={balances}
                onChange={(id, v) => setBalances((b) => ({ ...b, [id]: v }))}
              />
            )}
            {debts.length > 0 && (
              <BalanceSection
                title="負債"
                accounts={debts}
                balances={balances}
                onChange={(id, v) => setBalances((b) => ({ ...b, [id]: v }))}
              />
            )}
          </div>

          <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 16 }}>
            <button type="submit" className="button" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "保存中..." : "保存"}
            </button>
            {saveMutation.isError && (
              <span className="status-message status-message-error">
                {saveMutation.error.message}
              </span>
            )}
            {saveMutation.isSuccess && (
              <span className="status-message status-message-success">保存しました</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

type BalanceSectionProps = {
  title: string;
  accounts: AccountMaster[];
  balances: Record<string, string>;
  onChange: (id: string, value: string) => void;
};

function BalanceSection({ title, accounts, balances, onChange }: BalanceSectionProps) {
  return (
    <div className="panel">
      <div className="section-heading" style={{ marginBottom: 12 }}>
        <h3>{title}</h3>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>口座名</th>
              <th>カテゴリ</th>
              <th style={{ width: 200 }}>残高（円）</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => {
              const val = balances[account.id] ?? "";
              const parsed = val !== "" ? parseInt(val, 10) : null;
              return (
                <tr key={account.id}>
                  <td>{account.name}</td>
                  <td>{CATEGORY_LABELS[account.category]}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => onChange(account.id, e.target.value)}
                        min="0"
                        placeholder="例: 500000"
                        style={{
                          width: 140,
                          padding: "6px 10px",
                          border: "1px solid #c2cee1",
                          textAlign: "right",
                        }}
                      />
                      {parsed != null && !isNaN(parsed) && (
                        <span className="muted" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                          {formatMoney(parsed)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
