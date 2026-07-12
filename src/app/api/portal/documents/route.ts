import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/portal/session";
import { analyzeDocument } from "@/lib/portal/analyze";
import { addDocument, addApproval, listDocuments, findUserByEmail, type PortalUser } from "@/lib/portal/store";
import { sendApprovalRequest } from "@/lib/portal/notify";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const documents = await listDocuments(session.cid);
  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    const declaredType = String(form.get("declaredType") ?? "");
    const note = String(form.get("note") ?? "");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Please choose a file to upload." }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Files must be under 15 MB." }, { status: 400 });
    }

    // A specialized agent analyzes the document immediately on upload.
    const analysis = analyzeDocument({ declaredType, fileName: file.name, textHint: `${declaredType} ${note}` });

    const doc = await addDocument({
      clientId: session.cid,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      declaredType,
      analyzedType: analysis.category,
      analyzedAgent: analysis.agent,
      findings: analysis.findings,
      recommendedAction: analysis.recommendedAction,
      priority: analysis.priority,
      status: analysis.approval ? "action_created" : "analyzed",
    });

    // If the document requires a client decision, create an approval and send it.
    let approvalCreated = false;
    if (analysis.approval) {
      const approval = await addApproval({
        clientId: session.cid,
        agent: analysis.agent,
        title: analysis.approval.title,
        detail: analysis.approval.detail,
        amount: analysis.approval.amount,
        creditor: analysis.approval.creditor,
        documentId: doc.id,
      });
      // Build the user for notification routing (DB lookup or session for demo).
      const user: PortalUser =
        (session.demo ? undefined : await findUserByEmail(session.email)) ?? {
          id: session.uid, email: session.email, passwordHash: "", name: session.name,
          phone: null, opsClientId: session.cid, notifyEmail: true, notifySms: false,
        };
      await sendApprovalRequest(approval, user);
      approvalCreated = true;
    }

    return NextResponse.json({
      success: true,
      document: doc,
      analysis: {
        agent: analysis.agentName,
        category: analysis.category,
        findings: analysis.findings,
        recommendedAction: analysis.recommendedAction,
        priority: analysis.priority,
        approvalCreated,
      },
    });
  } catch (e) {
    console.error("upload error", e);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
