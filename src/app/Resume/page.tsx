import { Metadata } from "next";
import ResumeClient from "./ResumeClient";

export const metadata: Metadata = {
  title: "Resume Transit & Detail | SISTRO",
  description: "Dashboard Viewer untuk Resume Transit",
};

export default function ResumePage() {
  return <ResumeClient />;
}
