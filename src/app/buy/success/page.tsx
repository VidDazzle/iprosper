import { CheckCircle2 } from "lucide-react";

export default function BuySuccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0b0b] p-4 text-white">
      <div className="max-w-md rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
        <h1 className="text-2xl font-bold">Payment complete</h1>
        <p className="mt-2 text-sm text-gray-300">Thank you for your purchase! A receipt is on its way to your email.</p>
      </div>
    </div>
  );
}
