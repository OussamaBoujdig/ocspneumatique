import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { useI18n } from "@/lib/i18n";

export default function AdminLayout() {
  const { dir } = useI18n();

  return (
    <div className="flex h-screen bg-secondary overflow-hidden" dir={dir}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
