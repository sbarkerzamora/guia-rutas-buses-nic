import type { Metadata } from "next";
import { LegalDocument } from "@/app/_components/legal-document";

export const metadata: Metadata = {
  title: "Términos de uso",
};

export default function TermsPage() {
  return <LegalDocument kind="terms" />;
}
