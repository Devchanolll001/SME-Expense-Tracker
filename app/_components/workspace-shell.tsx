import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { SubmitButton } from "@/app/auth/_components/submit-button";

type WorkspaceShellProps = {
  active: "categories" | "dashboard" | "reports" | "transactions";
  businessName: string;
  children: React.ReactNode;
  userName: string;
};

const NAV_ITEMS = [
  { href: "/dashboard", key: "dashboard", label: "Dashboard" },
  { href: "/transactions", key: "transactions", label: "Transactions" },
  { href: "/categories", key: "categories", label: "Categories" },
  { href: "/reports", key: "reports", label: "Reports" },
] as const;

function Navigation({
  active,
  mode,
}: {
  active: WorkspaceShellProps["active"];
  mode: "desktop" | "mobile";
}) {
  return (
    <nav
      aria-label="Primary navigation"
      className={
        mode === "desktop"
          ? "space-y-1"
          : "flex gap-2 overflow-x-auto border-y border-[#6f3f20] bg-[#895129] px-4 py-3"
      }
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === active;
        const classes = [
          mode === "desktop"
            ? "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium"
            : "shrink-0 rounded-lg px-3 py-2 text-sm font-medium",
          isActive
            ? "bg-[#ad7a32] text-white shadow-sm"
            : "text-[#f7ead7] hover:bg-[#6f3f20] hover:text-white",
        ].join(" ");

        if ("href" in item) {
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={classes}
            >
              {item.label}
            </Link>
          );
        }

        return null;
      })}
    </nav>
  );
}

export function WorkspaceShell({
  active,
  businessName,
  children,
  userName,
}: WorkspaceShellProps) {
  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#171717]">
      <header className="border-b border-[#6f3f20] bg-[#895129] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f0d39c]">
              SME Expense Tracker
            </p>
            <h1 className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
              {businessName}
            </h1>
          </div>

          <div className="flex items-center gap-4">
              <p className="hidden max-w-56 truncate text-sm text-[#f7ead7] sm:block">
              {userName}
            </p>
            <form action={logout} className="w-28">
              <SubmitButton pendingText="Signing out..." variant="secondary">
                Sign out
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>

      <div className="lg:hidden">
        <Navigation active={active} mode="mobile" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-6 rounded-2xl border border-[#6f3f20] bg-[#895129] p-3 shadow-xl shadow-[#59371f]/15">
            <Navigation active={active} mode="desktop" />
          </div>
        </aside>

        <section>{children}</section>
      </div>
    </main>
  );
}
