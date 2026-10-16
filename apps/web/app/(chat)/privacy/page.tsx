import type { Metadata } from "next";
import { LegalDocument } from "@/app/_components/legal-document";

export const metadata: Metadata = {
  title: "Política de privacidad",
};

export default function PrivacyPage() {
  return <LegalDocument kind="privacy" />;
}
