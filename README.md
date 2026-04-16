import { isStandaloneMode } from "./utils.js";

export function createPwaManager(els, onStatusChange = () => {}) {
  let deferredPrompt = null;
  let registration = null;
  let isRefreshing = false;

  async function init() {
    if ("serviceWorker" in navigator) {
      try {
        registration = await navigator.serviceWorker.register("./sw.js");
        await registration.update().catch(() => {});
        syncUpdateBanner();
        watchRegistration(registration);
      } catch (error) {
        console.error("No se pudo registrar el service worker", error);
      }

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (isRefreshing) return;
        isRefreshing = true;
        window.location.reload();
      });
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event;
      if (els.installBtn) els.installBtn.hidden = false;
      onStatusChange(getStatus());
    });

    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      if (els.installBtn) els.installBtn.hidden = true;
      onStatusChange(getStatus());
    });

    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState !== "visible") return;
      await checkForUpdates();
    });

    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandaloneMode()) {
      if (els.iosInstallBtn) els.iosInstallBtn.hidden = false;
    }

    onStatusChange(getStatus());
  }

  function watchRegistration(currentRegistration) {
    currentRegistration.addEventListener("updatefound", () => {
      const worker = currentRegistration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed") {
          syncUpdateBanner();
          onStatusChange(getStatus());
        }
      });
    });
  }

  function syncUpdateBanner() {
    if (els.updateBanner) els.updateBanner.hidden = !registration?.waiting;
  }

  async function checkForUpdates() {
    const current = registration || await navigator.serviceWorker.getRegistration();
    if (!current) {
      onStatusChange(getStatus());
      return;
    }
    registration = current;
    await registration.update().catch(() => {});
    syncUpdateBanner();
    onStatusChange(getStatus());
  }

  async function promptInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (els.installBtn) els.installBtn.hidden = true;
    onStatusChange(getStatus());
  }

  async function refreshApp() {
    const current = registration || await navigator.serviceWorker.getRegistration();
    if (current?.waiting) {
      current.waiting.postMessage({ type: "SKIP_WAITING" });
      return;
    }
    await checkForUpdates();
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
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

  return { init, promptInstall, refreshApp, getStatus, checkForUpdates };
}
