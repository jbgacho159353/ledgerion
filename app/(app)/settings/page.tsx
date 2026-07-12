import { requireUserId } from "@/lib/session";
import { getAccountForUser } from "@/lib/data/account";
import { getSessionsForUser, getSetupsForUser } from "@/lib/data/lists";
import { createSession, deleteSession, createSetup, deleteSetup } from "@/lib/actions/lists";
import SettingsForm from "@/components/settings/SettingsForm";
import ChangePasswordForm from "@/components/settings/ChangePasswordForm";
import SimpleListManager from "@/components/settings/SimpleListManager";
import DeleteAccountForm from "@/components/settings/DeleteAccountForm";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const [account, sessions, setups] = await Promise.all([
    getAccountForUser(userId),
    getSessionsForUser(userId),
    getSetupsForUser(userId),
  ]);

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-slate-400">Manage your account balance, risk parameters, and trade lists.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SettingsForm
          startingBalance={Number(account.startingBalance)}
          riskPercent={Number(account.riskPercent)}
        />
        <ChangePasswordForm />
        <SimpleListManager
          title="Sessions"
          description="Used when logging a trade — pick from this list instead of typing freely."
          items={sessions}
          onCreate={createSession}
          onDelete={deleteSession}
          placeholder="e.g. Sydney"
          icon="⏱️"
        />
        <SimpleListManager
          title="Setups"
          description="Your named setups, patterns, or strategies — as specific or broad as you like, selectable when logging a trade."
          items={setups}
          onCreate={createSetup}
          onDelete={deleteSetup}
          placeholder="e.g. Breakout"
          icon="🏷️"
        />
      </div>

      <DeleteAccountForm />
    </div>
  );
}
