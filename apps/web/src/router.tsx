import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./ui/AppLayout";
import { AccountsPage } from "./ui/pages/AccountsPage";
import { CheckinPage } from "./ui/pages/CheckinPage";
import { DashboardPage } from "./ui/pages/DashboardPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "checkin", element: <CheckinPage /> },
      { path: "accounts", element: <AccountsPage /> },
    ],
  },
]);

