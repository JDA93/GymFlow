import { isStandaloneMode } from "./utils.js";

export function createPwaManager(els, onStatusChange = () => {}) {
  let deferredPrompt = null;
  let registration = null;

  async function init() {
    if ("serviceWorker" in navigator) {
      try {
        registration = await navigator.serviceWorker.register("./sw.js");
        if (registration.waiting) {
          els.updateBanner.hidden = false;
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
      } catch (error) {
        console.error("No se pudo registrar el service worker", error);
      }

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
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
      current.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  }

  function getStatus() {
    const manifestPresent = Boolean(document.querySelector('link[rel="manifest"]'))
      && Boolean(document.querySelector('link[rel="icon"]'));

    return {
      ios: /iphone|ipad|ipod/i.test(navigator.userAgent),
      standalone: isStandaloneMode(),
      swSupported: "serviceWorker" in navigator,
      registration,
      controlled: Boolean(navigator.serviceWorker?.controller),
      updateReady: Boolean(registration?.waiting),
      manifestPresent,
      installAvailable: Boolean(deferredPrompt)
    };
  }

  return {
    init,
    promptInstall,
    refreshApp,
    getStatus
  };
}
