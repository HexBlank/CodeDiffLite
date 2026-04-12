import { Code2 } from "lucide-react";
import { Link } from "react-router-dom";
import { UserMenu } from "@/components/UserMenu";

export function Header() {
  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
      <Link
        to="/"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <Code2 className="h-5 w-5 text-primary" />
        <span className="font-bold text-lg tracking-tight hidden sm:block">
          CodeDiff
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <UserMenu />
      </div>
    </header>
  );
}
