import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "../../lib/api";
import { formatAccountType, formatMoney, formatPercent } from "../../lib/format";
import { DataTable } from "../components/DataTable";

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  if (isLoading) {
    return <section className="panel">ダッシュボードを読み込み中...</section>;
  }

  if (error) {
    return <section className="panel">ダッシュボードの読み込みに失敗しました。</section>;
  }

  const latest = data?.latestSnapshot;
  const metrics = data?.metrics;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">概要</p>
          <h2>ダッシュボード</h2>
        </div>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span>純資産</span>
          <strong>{formatMoney(metrics?.netWorth ?? 0)}</strong>
        </article>
        <article className="metric-card">
          <span>総資産</span>
          <strong>{formatMoney(metrics?.totalAssets ?? 0)}</strong>
        </article>
        <article className="metric-card">
          <span>総負債</span>
          <strong>{formatMoney(metrics?.totalDebt ?? 0)}</strong>
        </article>
        <article className="metric-card">
          <span>クレジット利用率</span>
          <strong>{formatPercent(metrics?.creditUtilizationRatio ?? 0)}</strong>
        </article>
      </div>

      <div className="panel-stack">
        <section className="panel">
          <div className="section-heading">
            <h3>最新スナップショット</h3>
            <span>{latest?.snapshotDate ?? "データなし"}</span>
          </div>

          {latest ? (
            <DataTable
              columns={["口座名", "種別", "残高", "負債"]}
              rows={latest.accounts.map((account) => [
                account.name,
                formatAccountType(account.accountType),
                formatMoney(account.balance),
                account.isDebt ? "はい" : "いいえ",
              ])}
            />
          ) : (
            <p className="muted">最初のスナップショットを作成すると、ここに内容が表示されます。</p>
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <h3>毎月の固定支出</h3>
            <span>{formatMoney(metrics?.monthlyFixedExpenses ?? 0)}</span>
          </div>

          {latest ? (
            <DataTable
              columns={["項目", "金額"]}
              rows={latest.monthlyExpenses.map((expense) => [
                expense.category,
                formatMoney(expense.amount),
              ])}
            />
          ) : (
            <p className="muted">支出データはまだありません。</p>
          )}
        </section>
      </div>
    </section>
  );
}
