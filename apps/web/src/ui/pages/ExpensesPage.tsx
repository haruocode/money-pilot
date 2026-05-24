import { useQuery } from "@tanstack/react-query";
import { fetchSnapshots } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { DataTable } from "../components/DataTable";

export function ExpensesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["snapshots", "expenses"],
    queryFn: fetchSnapshots,
  });

  const latestSnapshot = data?.snapshots[0];

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">支出管理</p>
          <h2>支出一覧</h2>
        </div>
      </div>

      <section className="panel">
        {isLoading ? (
          <p>支出を読み込み中...</p>
        ) : error ? (
          <p>支出の読み込みに失敗しました。</p>
        ) : latestSnapshot ? (
          <DataTable
            columns={["項目", "金額"]}
            rows={latestSnapshot.monthlyExpenses.map((expense) => [
              expense.category,
              formatMoney(expense.amount),
            ])}
          />
        ) : (
          <p className="muted">支出データはまだ登録されていません。</p>
        )}
      </section>
    </section>
  );
}
