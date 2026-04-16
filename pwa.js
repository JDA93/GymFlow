import { isStandaloneMode } from "./utils.js";

export function createPwaManager(els, onStatusChange = () => {}) {
  let deferredPrompt = null;
  let registration = null;
  let shouldReloadAfterUpdate = false;
  let didReloadAfterUpdate = false;

  async function init() {
    if ("serviceWorker" in navigator) {
      try {
        registration = await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
        if (registration.waiting) {
          els.updateBanner.hidden = false;
          onStatusChange(getStatus());
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              els.updateBanner.hidden = false;
              onStatusChange(getStatus());
            }
          });
        });

        navigator.serviceWorker.ready.then((readyRegistration) => {
          if (!registration) registration = readyRegistration;
          onStatusChange(getStatus());
        }).catch(() => {});
      } catch (error) {
        console.error("No se pudo registrar el service worker", error);
      }

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (shouldReloadAfterUpdate && !didReloadAfterUpdate) {
          didReloadAfterUpdate = true;
          window.location.reload();
          return;
        }
        onStatusChange(getStatus());
      });
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event;
      els.installBtn.hidden = false;
      onStatusChange(getStatus());
    });

    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      els.installBtn.hidden = true;
      onStatusChange(getStatus());
    });

    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandaloneMode()) {
      els.iosInstallBtn.hidden = false;
    }

    onStatusChange(getStatus());
  }

  async function promptInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    els.installBtn.hidden = true;
    onStatusChange(getStatus());
  }

  async function refreshApp() {
    const current = registration || await navigator.serviceWorker.getRegistration();
    if (current?.waiting) {
      shouldReloadAfterUpdate = true;
      current.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  }

  function getStatus() {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    const iconPresent = Boolean(document.querySelector('link[rel="icon"]')) || Boolean(document.querySelector('link[rel="apple-touch-icon"]'));
    const secure = window.isSecureContext || /localhost|127\.0\.0\.1/.test(window.location.hostname);
    const canPromptInstall = Boolean(deferredPrompt);
    const manifestPresent = Boolean(manifestLink) && iconPresent;
    return {
      ios: /iphone|ipad|ipod/i.test(navigator.userAgent),
      standalone: isStandaloneMode(),
      swSupported: "serviceWorker" in navigator,
      registration,
      controlled: Boolean(navigator.serviceWorker?.controller),
      updateReady: Boolean(registration?.waiting),
      manifestPresent,
      installAvailable: canPromptInstall,
      secureContext: secure,
      manifestLinkPresent: Boolean(manifestLink),
      iconPresent
    };
  }

  return { init, promptInstall, refreshApp, getStatus };
}
