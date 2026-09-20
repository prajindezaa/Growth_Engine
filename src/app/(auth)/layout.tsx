import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ge-erp-auth-shell">
      {/* Background with subtle brushed metallic reflections */}
      <div className="ge-erp-auth-bg-overlay" />
      <main className="ge-erp-auth-main">
        {children}
      </main>
    </div>
  );
}
