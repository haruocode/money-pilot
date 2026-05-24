import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./ui/AppLayout";
import { AccountsPage } from "./ui/pages/AccountsPage";
import { DashboardPage } from "./ui/pages/DashboardPage";
import { ExpensesPage } from "./ui/pages/ExpensesPage";
import { SnapshotsPage } from "./ui/pages/SnapshotsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "accounts", element: <AccountsPage /> },
      { path: "snapshots", element: <SnapshotsPage /> },
      { path: "expenses", element: <ExpensesPage /> },
    ],
  },
]);

