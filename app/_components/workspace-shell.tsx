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
  { key: "settings", label: "Settings" },
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
          : "flex gap-2 overflow-x-auto border-y border-slate-200 bg-white px-4 py-3"
      }
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === active;
        const classes = [
          mode === "desktop"
            ? "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium"
            : "shrink-0 rounded-lg px-3 py-2 text-sm font-medium",
          isActive
            ? "bg-emerald-50 text-emerald-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
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

        return (
          <span
            key={item.key}
            aria-disabled="true"
            className={[
              mode === "desktop"
                ? "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium"
                : "shrink-0 rounded-lg px-3 py-2 text-sm font-medium",
              "cursor-not-allowed text-slate-400",
            ].join(" ")}
          >
            {item.label}
          </span>
        );
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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-emerald-600">
              Business
            </p>
            <h1 className="truncate text-xl font-bold text-slate-950 sm:text-2xl">
              {businessName}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <p className="hidden max-w-56 truncate text-sm text-slate-500 sm:block">
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
          <div className="sticky top-6 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <Navigation active={active} mode="desktop" />
          </div>
        </aside>

        <section>{children}</section>
      </div>
    </main>
  );
}
