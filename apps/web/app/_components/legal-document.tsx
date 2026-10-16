"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import { getLegalDocument, type LegalDocumentKind } from "@/lib/i18n/legal";

export function LegalDocument({ kind }: { readonly kind: LegalDocumentKind }) {
  const { locale } = useLocale();
  const document = getLegalDocument(locale, kind);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-4 pt-14 pb-16 sm:px-6 md:pt-10">
        <article className="rounded-lg border border-border/60 bg-card/85 p-6 backdrop-blur-sm sm:p-8">
          <h1 className="text-2xl font-semibold">{document.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{document.updated}</p>

          <div className="mt-8 space-y-6">
            {document.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-base font-medium">{section.heading}</h2>
                <div className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
