import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ge-auth-wrapper">
      {/* Dynamic ambient gradient wave backdrop (inspired by reference light green organic curves) */}
      <div className="ge-auth-bg-ambient">
        <div className="ge-auth-blob ge-auth-blob-1" />
        <div className="ge-auth-blob ge-auth-blob-2" />
        <div className="ge-auth-blob ge-auth-blob-3" />
      </div>

      <main className="ge-auth-container">
        {children}
      </main>
    </div>
  );
}
