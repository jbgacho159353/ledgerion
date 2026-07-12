import { requireAdmin } from "@/lib/session";
import { getPendingUsers, getApprovedUsers } from "@/lib/data/admin";
import { approveUser, rejectUser, deleteUser } from "@/lib/actions/admin";
import AdminUsersClient from "@/components/admin/AdminUsersClient";

export default async function AdminUsersPage() {
  await requireAdmin();

  const [pending, approved] = await Promise.all([getPendingUsers(), getApprovedUsers()]);

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-white">User approvals</h1>
        <p className="text-sm text-slate-400">Approve or reject pending signups, and manage existing users.</p>
      </div>
      <AdminUsersClient
        pending={pending.map((u) => ({ id: u.id, email: u.email, createdAt: u.createdAt.toISOString() }))}
        approved={approved.map((u) => ({ id: u.id, email: u.email, createdAt: u.createdAt.toISOString(), isAdmin: u.isAdmin }))}
        onApprove={approveUser}
        onReject={rejectUser}
        onDelete={deleteUser}
      />
    </div>
  );
}
