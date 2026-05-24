import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { AccountCategory, DashboardAccount } from "@money-pilot/shared";
import { fetchDashboard } from "../../lib/api";
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

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  if (isLoading) {
    return (
      <div className="page">
        <p className="muted">読み込み中...</p>
      </div>
    );
  }

  if (!data?.snapshotDate) {
    return (
      <div className="page">
        <div className="page-header">
          <h2>ダッシュボード</h2>
        </div>
        <p className="muted">
          まだデータがありません。
          <Link to="/checkin" style={{ color: "#1f5eff", marginLeft: 4 }}>
            残高入力
          </Link>
          から今月の残高を登録してください。
        </p>
      </div>
    );
  }

  const assets = data.accounts.filter((a) => !a.isDebt);
  const debts = data.accounts.filter((a) => a.isDebt);

  const [year, month] = data.snapshotDate.split("-");

  return (
    <div className="page">
      <div className="page-header">
        <h2>ダッシュボード</h2>
        <span className="muted" style={{ fontSize: 13 }}>
          {year}年{parseInt(month, 10)}月時点
        </span>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span>純資産</span>
          <strong style={{ color: data.netWorth >= 0 ? "#172033" : "#b42318" }}>
            {formatMoney(data.netWorth)}
          </strong>
        </article>
        <article className="metric-card">
          <span>総資産</span>
          <strong>{formatMoney(data.totalAssets)}</strong>
        </article>
        <article className="metric-card">
          <span>総負債</span>
          <strong>{formatMoney(data.totalDebt)}</strong>
        </article>
      </div>

      <div className="panel-stack">
        {assets.length > 0 && (
          <AccountBreakdown title="資産" accounts={assets} />
        )}
        {debts.length > 0 && (
          <AccountBreakdown title="負債" accounts={debts} />
        )}
      </div>
    </div>
  );
}

function AccountBreakdown({ title, accounts }: { title: string; accounts: DashboardAccount[] }) {
  const total = accounts.reduce((sum, a) => sum + a.balance, 0);
  return (
    <div className="panel">
      <div className="section-heading" style={{ marginBottom: 12 }}>
        <h3>{title}</h3>
        <span style={{ fontWeight: 600 }}>{formatMoney(total)}</span>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>口座名</th>
              <th>カテゴリ</th>
              <th style={{ textAlign: "right" }}>残高</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.accountId}>
                <td>{a.accountName}</td>
                <td>{CATEGORY_LABELS[a.category]}</td>
                <td style={{ textAlign: "right" }}>{formatMoney(a.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
