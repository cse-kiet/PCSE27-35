// The sidebar/navbar layout is handled by the parent (protected)/layout.tsx
// This file just passes children through to avoid double-wrapping.
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default DashboardLayout;
