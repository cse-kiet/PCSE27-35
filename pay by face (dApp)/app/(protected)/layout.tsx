// Server Component — no "use client" here.
// Interactive sidebar state lives in ClientShell to avoid SSR/hydration ID mismatches.
import { ClientShell } from "./client-shell";

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  return <ClientShell>{children}</ClientShell>;
};

export default ProtectedLayout;
