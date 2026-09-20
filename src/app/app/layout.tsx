import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import Image from "next/image";
import Link from "next/link";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
