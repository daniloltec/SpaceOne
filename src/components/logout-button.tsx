import { signOut } from "@/auth";

export function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-white/30 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
      >
        Sair
      </button>
    </form>
  );
}
