"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale } from "@/components/i18n/locale-provider";

export function TemplateFooterLinks() {
  const { t } = useLocale();

  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 px-2 text-center text-[11px] leading-4 text-muted-foreground/50 sm:text-xs">
      <FooterRouteLink href="/terms">{t("legal.terms")}</FooterRouteLink>
      <FooterRouteLink href="/privacy">{t("legal.privacy")}</FooterRouteLink>
      <FooterRouteLink href="/cookies">{t("legal.cookies")}</FooterRouteLink>
    </footer>
  );
}

function FooterRouteLink({
  children,
  href,
}: {
  readonly children: ReactNode;
  readonly href: string;
}) {
  return (
    <Link
      className="underline underline-offset-4 transition-colors hover:text-foreground"
      href={href}
    >
      {children}
    </Link>
  );
}
