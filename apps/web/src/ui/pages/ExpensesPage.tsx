import { useQuery } from "@tanstack/react-query";
import { fetchSnapshots } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { useUiStore } from "../../store/ui-store";
import { DataTable } from "../components/DataTable";

export function ExpensesPage() {
  const { currency } = useUiStore();
  const { data, isLoading, error } = useQuery({
    queryKey: ["snapshots", "expenses"],
    queryFn: fetchSnapshots,
  });

  const latestSnapshot = data?.snapshots[0];

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Operating costs</p>
          <h2>Expenses</h2>
        </div>
      </div>

      <section className="panel">
        {isLoading ? (
          <p>Loading expenses...</p>
        ) : error ? (
          <p>Failed to load expenses.</p>
        ) : latestSnapshot ? (
          <DataTable
            columns={["Category", "Amount"]}
            rows={latestSnapshot.monthlyExpenses.map((expense) => [
              expense.category,
              formatMoney(expense.amount, currency),
            ])}
          />
        ) : (
          <p className="muted">No expenses captured yet.</p>
        )}
      </section>
    </section>
  );
}

