/** Reports uncaught errors to the backend so a player's console isn't the only record. */
export function installErrorReporter(): void {
  const send = (message: string, stack?: string) => {
    fetch("/api/log-client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, stack, url: window.location.href }),
      keepalive: true,
    }).catch(() => {
      /* best effort */
    });
  };

  window.addEventListener("error", (e) => send(e.message, e.error?.stack));
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    send(typeof reason === "string" ? reason : reason?.message || "Unhandled rejection", reason?.stack);
  });
}
