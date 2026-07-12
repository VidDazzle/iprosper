import Link from "next/link";
import { Panel, StatCard } from "@/components/admin/ui";
import { listAllDocuments } from "@/lib/portal/store";
import { getClient } from "@/lib/admin/mock-data";
import { getAgent } from "@/lib/agents/registry";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "border-l-rose-400",
  high: "border-l-amber-400",
  normal: "border-l-cyan-400",
};

export default async function AdminDocumentsPage() {
  const documents = await listAllDocuments();
  const urgent = documents.filter((d) => d.priority === "urgent").length;
  const high = documents.filter((d) => d.priority === "high").length;
  const actioned = documents.filter((d) => d.status === "action_created").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Documents</h1>
        <p className="text-sm text-slate-400">Everything clients have uploaded, with the AI agent&apos;s analysis and the action it triggered.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Documents" value={String(documents.length)} sub="uploaded by clients" accent="cyan" />
        <StatCard label="Urgent" value={String(urgent)} sub="legal / time-sensitive" accent="rose" />
        <StatCard label="High priority" value={String(high)} accent="amber" />
        <StatCard label="Actions created" value={String(actioned)} sub="approvals generated" accent="violet" />
      </div>

      {documents.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
          No documents uploaded yet.
        </p>
      ) : (
        <Panel title={`All documents (${documents.length})`}>
          <div className="space-y-3">
            {documents.map((d) => {
              const client = getClient(d.clientId);
              const agent = d.analyzedAgent ? getAgent(d.analyzedAgent) : null;
              return (
                <div key={d.id} className={`rounded-lg border border-white/10 border-l-2 bg-white/[0.02] p-4 ${PRIORITY_STYLE[d.priority]}`}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-white">{d.fileName}</span>
                      {d.priority !== "normal" && (
                        <span className={`text-xs uppercase ${d.priority === "urgent" ? "text-rose-300" : "text-amber-300"}`}>{d.priority}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <Link href={`/admin/clients/${d.clientId}`} className="text-cyan-300 hover:text-cyan-200">{client?.name ?? d.clientId}</Link>
                      <span>{new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  {agent && <p className="mb-1 text-xs text-violet-300">Analyzed by {agent.name}</p>}
                  {d.recommendedAction && <p className="text-sm text-slate-300"><span className="text-slate-500">Action:</span> {d.recommendedAction}</p>}
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
