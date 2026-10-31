import { redirect } from "next/navigation";
import { listFounders } from "../../lib/founders";
import { DEFAULT_GOAL } from "../../lib/goal";
import { session } from "../../lib/auth";
import InboxApp from "../inbox-app";

export const dynamic = "force-dynamic";

export default async function Inbox() {
  const me = await session();
  if (!me) redirect("/");

  const founders = await listFounders();
  const real = founders.filter((f) => !f.demo);
  const choices = me.admin ? founders : founders.filter((f) => f.demo || f.id === me.id || !f.demo);
  const defA = me.id ?? real[0]?.id ?? founders[0].id;
  const defB = real.find((f) => f.id !== defA)?.id ?? founders.find((f) => f.id !== defA)!.id;

  return (
    <main className="app-main">
      <InboxApp
        me={me.id}
        founders={choices.map(({ id, name, demo }) => ({ id, name, demo }))}
        defaultA={defA}
        defaultB={defB}
        defaultGoal={DEFAULT_GOAL}
      />
    </main>
  );
}
