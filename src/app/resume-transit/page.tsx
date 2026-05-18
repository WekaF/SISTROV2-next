import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ResumeTransitClient from "./ResumeTransitClient";

export default async function ResumeTransitPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <ResumeTransitClient />;
}
