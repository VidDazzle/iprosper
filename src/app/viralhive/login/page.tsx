import { loginAction } from "@/lib/viralhive/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0e0e0e] px-4 text-white">
      <Card className="w-full max-w-sm bg-[#161616] text-white border-white/10">
        <CardHeader>
          <CardTitle className="text-xl">ViralHive</CardTitle>
          <CardDescription>Enter the admin password to open the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="flex flex-col gap-4">
            <input type="hidden" name="next" value={params.next ?? "/viralhive"} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required autoFocus />
            </div>
            {params.error && <p className="text-sm text-red-400">Incorrect password.</p>}
            <Button type="submit" className="w-full">
              Log in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
