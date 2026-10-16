import type { Metadata } from "next";
import { LegalDocument } from "@/app/_components/legal-document";

export const metadata: Metadata = {
  title: "Política de cookies",
};

export default function CookiesPage() {
  return <LegalDocument kind="cookies" />;
}
