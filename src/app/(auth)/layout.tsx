import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
        background: "var(--ge-bg-primary)",
      }}
    >
      {/* Ambient glow effects */}
      <div
        className="ge-glow"
        style={{ top: "-200px", left: "-100px" }}
      />
      <div
        className="ge-glow"
        style={{
          bottom: "-200px",
          right: "-100px",
          background:
            "radial-gradient(circle, rgba(14, 165, 233, 0.06) 0%, transparent 70%)",
        }}
      />

      <div
        className="ge-animate-in"
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          maxWidth: "420px",
        }}
      >
        {/* Logo */}
        <div
          style={{ marginBottom: "32px" }}
          className="ge-animate-in"
        >
          <Image
            src="/logo.jpeg"
            alt="GrowthEngine"
            width={64}
            height={64}
            priority
            style={{
              borderRadius: "16px",
              boxShadow: "0 4px 24px rgba(6, 182, 212, 0.2)",
            }}
          />
        </div>

        {/* Card */}
        <div className="ge-card ge-animate-in ge-animate-delay-1">
          {children}
        </div>
      </div>
    </div>
  );
}
