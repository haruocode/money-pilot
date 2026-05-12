import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "../../lib/api";
import { formatMoney, formatPercent } from "../../lib/format";
import { useUiStore } from "../../store/ui-store";
import { DataTable } from "../components/DataTable";

export function DashboardPage() {
  const { currency, setCurrency } = useUiStore();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  if (isLoading) {
    return <section className="panel">Loading dashboard...</section>;
  }

  if (error) {
    return <section className="panel">Failed to load dashboard.</section>;
  }

  const latest = data?.latestSnapshot;
  const metrics = data?.metrics;

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Dashboard</h2>
        </div>

        <label className="field-inline">
          <span>Currency</span>
          <input
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          />
        </label>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span>Net worth</span>
          <strong>{formatMoney(metrics?.netWorth ?? 0, currency)}</strong>
        </article>
        <article className="metric-card">
          <span>Total assets</span>
          <strong>{formatMoney(metrics?.totalAssets ?? 0, currency)}</strong>
        </article>
        <article className="metric-card">
          <span>Total debt</span>
          <strong>{formatMoney(metrics?.totalDebt ?? 0, currency)}</strong>
        </article>
        <article className="metric-card">
          <span>Credit utilization</span>
          <strong>{formatPercent(metrics?.creditUtilizationRatio ?? 0)}</strong>
        </article>
      </div>

      <div className="panel-stack">
        <section className="panel">
          <div className="section-heading">
            <h3>Latest snapshot</h3>
            <span>{latest?.snapshotDate ?? "No data"}</span>
          </div>

          {latest ? (
            <DataTable
              columns={["Account", "Type", "Balance", "Debt"]}
              rows={latest.accounts.map((account) => [
                account.name,
                account.accountType,
                formatMoney(account.balance, currency),
                account.isDebt ? "Yes" : "No",
              ])}
            />
          ) : (
            <p className="muted">Create the first snapshot to populate the dashboard.</p>
          )}
        </section>

        <section className="panel">
          <div className="section-heading">
            <h3>Monthly fixed expenses</h3>
            <span>{formatMoney(metrics?.monthlyFixedExpenses ?? 0, currency)}</span>
          </div>

          {latest ? (
            <DataTable
              columns={["Category", "Amount"]}
              rows={latest.monthlyExpenses.map((expense) => [
                expense.category,
                formatMoney(expense.amount, currency),
              ])}
            />
          ) : (
            <p className="muted">No expense rows yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}

