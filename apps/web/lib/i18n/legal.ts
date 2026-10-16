import type { Locale } from "./locale";

export type LegalDocumentKind = "terms" | "privacy" | "cookies";

type LegalSection = {
  readonly heading: string;
  readonly paragraphs: readonly string[];
};

export type LegalDocumentContent = {
  readonly title: string;
  readonly updated: string;
  readonly sections: readonly LegalSection[];
};

const legalDocuments: Record<Locale, Record<LegalDocumentKind, LegalDocumentContent>> = {
  es: {
    terms: {
      title: "Términos de uso",
      updated: "Última actualización: 15 de octubre de 2026",
      sections: [
        {
          heading: "El servicio",
          paragraphs: [
            "Este asistente responde preguntas sobre rutas de bus urbanas e interurbanas de Nicaragua a partir de datos comunitarios y de referencia. Es una herramienta informativa y no representa a ninguna empresa de transporte ni entidad estatal.",
          ],
        },
        {
          heading: "Información orientativa",
          paragraphs: [
            "Horarios, tarifas, paradas y transbordos pueden cambiar sin previo aviso. Confirma siempre los detalles con el conductor, la terminal o la fuente oficial antes de viajar.",
          ],
        },
        {
          heading: "Uso aceptable",
          paragraphs: [
            "No uses el servicio para fines ilícitos, para enviar contenido dañino ni para intentar afectar su funcionamiento o el de otros usuarios.",
          ],
        },
        {
          heading: "Límite de responsabilidad",
          paragraphs: [
            "No nos hacemos responsables de decisiones de viaje tomadas con base en la información del asistente, ni de demoras, cobros o cambios de ruta fuera de nuestro control.",
          ],
        },
        {
          heading: "Cambios",
          paragraphs: [
            "Podemos actualizar estos términos y las funciones del asistente en cualquier momento. La versión vigente es la publicada en esta página.",
          ],
        },
      ],
    },
    privacy: {
      title: "Política de privacidad",
      updated: "Última actualización: 15 de octubre de 2026",
      sections: [
        {
          heading: "Datos que manejamos",
          paragraphs: [
            "Los mensajes que envías al asistente y el historial de conversaciones, tus preferencias de idioma y, si la activas, tu ubicación aproximada para sugerir paradas cercanas.",
          ],
        },
        {
          heading: "Dónde se guardan",
          paragraphs: [
            "Los chats se guardan en el almacenamiento local de tu navegador y, cuando inicias sesión, también en la base de datos de la aplicación para que puedas recuperarlos en tus dispositivos.",
          ],
        },
        {
          heading: "Ubicación",
          paragraphs: [
            "La ubicación solo se usa cuando pulsas «Usar mi ubicación» y se incluye en el mensaje que envías. No te rastreamos en segundo plano.",
          ],
        },
        {
          heading: "No vendemos tus datos",
          paragraphs: [
            "No compartimos ni vendemos tu información personal ni tus conversaciones a terceros. Las métricas de uso son anónimas y agregadas.",
          ],
        },
        {
          heading: "Tus opciones",
          paragraphs: [
            "Puedes eliminar tus chats desde la barra lateral. Si borras los datos de tu navegador se eliminan los chats guardados localmente; si inicias sesión, puedes pedir la eliminación de tu cuenta escribiendo al responsable del servicio.",
          ],
        },
      ],
    },
    cookies: {
      title: "Política de cookies",
      updated: "Última actualización: 15 de octubre de 2026",
      sections: [
        {
          heading: "Qué son",
          paragraphs: [
            "Las cookies son archivos pequeños que el navegador guarda para recordar tus preferencias y tu sesión.",
          ],
        },
        {
          heading: "Cookies que usamos",
          paragraphs: [
            "eve-locale (idioma), eve-chat-sidebar (estado de la barra lateral), eve_logged_in y la cookie de sesión de acceso. Son necesarias para el funcionamiento de la app; no usamos cookies publicitarias ni de seguimiento.",
          ],
        },
        {
          heading: "Almacenamiento local",
          paragraphs: [
            "Además de cookies usamos el almacenamiento local del navegador para guardar tus conversaciones cuando no has iniciado sesión.",
          ],
        },
        {
          heading: "Cómo gestionarlas",
          paragraphs: [
            "Puedes borrar o bloquear las cookies desde la configuración de tu navegador. Si bloqueas las cookies de sesión no podrás iniciar sesión; el asistente seguirá funcionando sin historial.",
          ],
        },
      ],
    },
  },
  en: {
    terms: {
      title: "Terms of use",
      updated: "Last updated: October 15, 2026",
      sections: [
        {
          heading: "The service",
          paragraphs: [
            "This assistant answers questions about urban and intercity bus routes in Nicaragua from community and reference data. It is an informational tool and does not represent any transport company or government entity.",
          ],
        },
        {
          heading: "Reference information",
          paragraphs: [
            "Schedules, fares, stops and transfers can change without notice. Always confirm the details with the driver, the terminal or the official source before traveling.",
          ],
        },
        {
          heading: "Acceptable use",
          paragraphs: [
            "Do not use the service for unlawful purposes, to send harmful content, or to attempt to affect its operation or that of other users.",
          ],
        },
        {
          heading: "Limitation of liability",
          paragraphs: [
            "We are not responsible for travel decisions made based on the assistant's information, or for delays, charges or route changes beyond our control.",
          ],
        },
        {
          heading: "Changes",
          paragraphs: [
            "We may update these terms and the assistant's features at any time. The version in force is the one published on this page.",
          ],
        },
      ],
    },
    privacy: {
      title: "Privacy policy",
      updated: "Last updated: October 15, 2026",
      sections: [
        {
          heading: "Data we handle",
          paragraphs: [
            "The messages you send to the assistant and your conversation history, your language preferences and, if you enable it, your approximate location to suggest nearby stops.",
          ],
        },
        {
          heading: "Where it is stored",
          paragraphs: [
            "Chats are stored in your browser's local storage and, when you sign in, also in the application database so you can recover them on your devices.",
          ],
        },
        {
          heading: "Location",
          paragraphs: [
            "Location is only used when you press “Use my location” and is included in the message you send. We do not track you in the background.",
          ],
        },
        {
          heading: "We do not sell your data",
          paragraphs: [
            "We do not share or sell your personal information or your conversations to third parties. Usage metrics are anonymous and aggregated.",
          ],
        },
        {
          heading: "Your options",
          paragraphs: [
            "You can delete your chats from the sidebar. Clearing your browser data removes locally stored chats; if you sign in, you can request deletion of your account by writing to the service owner.",
          ],
        },
      ],
    },
    cookies: {
      title: "Cookie policy",
      updated: "Last updated: October 15, 2026",
      sections: [
        {
          heading: "What they are",
          paragraphs: [
            "Cookies are small files the browser stores to remember your preferences and your session.",
          ],
        },
        {
          heading: "Cookies we use",
          paragraphs: [
            "eve-locale (language), eve-chat-sidebar (sidebar state), eve_logged_in and the sign-in session cookie. They are required for the app to work; we do not use advertising or tracking cookies.",
          ],
        },
        {
          heading: "Local storage",
          paragraphs: [
            "Besides cookies we use the browser's local storage to keep your conversations when you are not signed in.",
          ],
        },
        {
          heading: "How to manage them",
          paragraphs: [
            "You can delete or block cookies from your browser settings. If you block session cookies you will not be able to sign in; the assistant will still work without history.",
          ],
        },
      ],
    },
  },
};

export function getLegalDocument(locale: Locale, kind: LegalDocumentKind): LegalDocumentContent {
  return legalDocuments[locale][kind];
}
