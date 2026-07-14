import { requireSession } from "@/lib/portal/session";
import PortalShell from "@/components/portal/shell";
import DocumentUpload from "@/components/portal/upload";
import { listDocuments } from "@/lib/portal/store";
import { getAgent } from "@/lib/agents/registry";
import { FileText } from "lucide-react";

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "border-l-rose-400",
  high: "border-l-amber-400",
  normal: "border-l-cyan-400",
};

export default async function DocumentsPage() {
  const session = await requireSession();
  const documents = await listDocuments(session.cid);

  return (
    <PortalShell session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-sm text-slate-400">
            Upload statements, settlement letters, or any notice you receive. A specialized AI agent analyzes it
            immediately and tells you what happens next.
          </p>
        </div>

        <DocumentUpload />

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Your documents ({documents.length})
          </h2>
          {documents.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
              Nothing uploaded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((d) => {
                const agent = d.analyzedAgent ? getAgent(d.analyzedAgent) : null;
                return (
                  <div key={d.id} className={`rounded-xl border border-white/10 border-l-2 bg-white/[0.03] p-5 ${PRIORITY_STYLE[d.priority]}`}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-white">{d.fileName}</span>
                        {d.priority !== "normal" && (
                          <span className={`text-xs uppercase ${d.priority === "urgent" ? "text-rose-300" : "text-amber-300"}`}>
                            {d.priority}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    {agent && <p className="mb-2 text-xs text-violet-300">Analyzed by {agent.name}</p>}
                    {d.findings.length > 0 && (
                      <ul className="mb-2 space-y-1 text-sm text-slate-400">
                        {d.findings.map((f, i) => (
                          <li key={i} className="flex gap-2"><span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-slate-600" />{f}</li>
                        ))}
                      </ul>
                    )}
                    {d.recommendedAction && (
                      <p className="text-sm text-slate-300"><span className="text-slate-500">Next step:</span> {d.recommendedAction}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
