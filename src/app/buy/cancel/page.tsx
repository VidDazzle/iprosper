export default function BuyCancel() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0b0b] p-4 text-white">
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <h1 className="text-2xl font-bold">Checkout cancelled</h1>
        <p className="mt-2 text-sm text-gray-400">No charge was made. You can close this window or try again.</p>
      </div>
    </div>
  );
}
