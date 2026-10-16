"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ComposerFooterControls,
  ErrorToast,
  type AgentChatControllerStatus,
} from "@/app/_components/agent-chat";
import { useChatShell } from "@/app/_components/chat-shell-context";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getDictionary } from "@/lib/i18n/dictionary";
import { useLocale } from "@/components/i18n/locale-provider";
import { ChatComposer } from "@/components/chat/composer";
import { TemplateFooterLinks } from "@/components/chat/template-footer-links";
import { TransportMarkIcon } from "@/components/icons";
import { createProvisionalChatId, writePendingChatMessage } from "@/lib/chat/provisional-chat";
import type { SetupStatus } from "@/lib/chat/types";
import { getChatMessageLengthError } from "@/lib/chat/limits";

const IDLE_CONTROLLER_STATUS: AgentChatControllerStatus = {
  isBusy: false,
  isDisabled: false,
  isEmpty: true,
};

export function HomeChatPage() {
  const { requestSignIn, setActiveChatId, setupStatus, viewer } = useChatShell();
  const { locale, t } = useLocale();
  const dictionary = getDictionary(locale);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const setupReady = setupStatus.appReady;
  const pathname = usePathname();
  const router = useRouter();
  const toastError = clientError && dismissedError !== clientError ? clientError : null;

  useEffect(() => {
    setActiveChatId(null);
  }, [setActiveChatId]);

  useEffect(() => {
    if (pathname === "/") {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!viewer) {
      return;
    }

    const restoredDraft = window.sessionStorage.getItem("eve-chat-draft");

    if (restoredDraft) {
      setDraft(restoredDraft);
      window.sessionStorage.removeItem("eve-chat-draft");
    }
  }, [viewer]);

  useEffect(() => {
    setDismissedError(null);
  }, [clientError]);

  const handleSubmit = useCallback(
    (text: string) => {
      const message = text.trim();

      if (!message || submittingRef.current) {
        return;
      }

      setClientError(null);

      const lengthError = getChatMessageLengthError(message);

      if (lengthError) {
        setClientError(lengthError);
        return;
      }

      if (!setupReady) {
        setClientError(
          getHomeComposerDisabledReason({ setupStatus, submitting }) ??
            "Finish setup before chatting.",
        );
        return;
      }

      if (!viewer) {
        requestSignIn(message);
        return;
      }

      submittingRef.current = true;
      setSubmitting(true);
      setDraft("");

      // Sin prefijo de idioma: el agente lo detecta del mensaje y así no se
      // filtra al globo visible del usuario.
      const messageWithContext = [
        location ? `[Ubicación aproximada: ${location}]` : null,
        message,
      ]
        .filter(Boolean)
        .join(" ");
      const provisionalChatId = createProvisionalChatId();
      const didStoreMessage = writePendingChatMessage(provisionalChatId, messageWithContext);

      if (!didStoreMessage) {
        submittingRef.current = false;
        setSubmitting(false);
        setDraft(message);
        setClientError("Failed to start chat.");
        return;
      }

      setActiveChatId(provisionalChatId);
      router.push(`/chat/${provisionalChatId}`, { scroll: false });
    },
    [requestSignIn, router, setActiveChatId, setupReady, setupStatus, submitting, viewer],
  );

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationError("Tu navegador no permite geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(
          `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
        );
        setLocationError(null);
      },
      () => {
        setLocationError("No se pudo obtener la ubicación.");
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, []);

  const composerDisabled = !setupReady;
  const composerDisabledReason = getHomeComposerDisabledReason({
    setupStatus,
    submitting,
  });

  if (pathname !== "/") {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-14 md:pt-8">
      {toastError ? (
        <ErrorToast message={toastError} onDismiss={() => setDismissedError(toastError)} />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col justify-between px-4 pt-8 pb-4 sm:px-6 sm:pb-6">
        <div className="flex min-h-0 flex-1 items-center justify-center pb-20 sm:pb-[12vh]">
          <div className="w-full max-w-2xl space-y-5 sm:space-y-7 md:space-y-8">
            {viewer && setupStatus.authMode !== "local-dev" ? null : (
              <div className="flex justify-center">
                <LanguageSwitcher />
              </div>
            )}
            <h1 className="flex justify-center">
              <TransportMarkIcon className="size-16 text-foreground sm:size-20 md:size-24" />
            </h1>
            <div className="flex flex-wrap justify-center gap-2">
              {dictionary.home.suggestions.map((suggestion) => (
                <button
                  className="rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  key={suggestion}
                  onClick={() => handleSubmit(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <button
                className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={requestLocation}
                type="button"
              >
                {t("home.useLocation")}
              </button>
              {location ? <span className="text-muted-foreground">{t("home.locationActive")}: {location}</span> : null}
              {locationError ? <span className="text-destructive">{t("home.locationError")}</span> : null}
            </div>
            <ChatComposer
              autoFocus
              disabled={composerDisabled}
              disabledReason={composerDisabledReason}
              footerStart={<ComposerFooterControls setupStatus={setupStatus} />}
              isBusy={IDLE_CONTROLLER_STATUS.isBusy}
              isPreparing={submitting}
              onChange={setDraft}
              onStop={() => {}}
              onSubmit={handleSubmit}
              placeholder={t("home.placeholder")}
              value={draft}
            />
          </div>
        </div>
        <TemplateFooterLinks />
      </div>
    </div>
  );
}

function getHomeComposerDisabledReason({
  setupStatus,
  submitting,
}: {
  readonly setupStatus: SetupStatus;
  readonly submitting: boolean;
}) {
  if (!setupStatus.appReady) {
    const missing = setupStatus.missing.length
      ? ` Missing: ${setupStatus.missing.join(", ")}.`
      : "";

    return `Finish setup before chatting.${missing}`;
  }

  if (submitting) {
    return "Preparing chat.";
  }

  return undefined;
}
