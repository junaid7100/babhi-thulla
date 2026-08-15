// Forwards browser console errors / uncaught exceptions to the backend so they land in
// backend/logs/client-errors.log — a persistent record instead of a lost browser console.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

const MAX_REPORTS_PER_SESSION = 50;
let reportCount = 0;

function baseInfo() {
  return {
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function send(payload) {
  if (reportCount >= MAX_REPORTS_PER_SESSION) return;
  reportCount += 1;
  fetch(`${SOCKET_URL}/api/log-client-error`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

window.addEventListener("error", (event) => {
  send({
    ...baseInfo(),
    type: "error",
    message: event.message,
    stack: event.error?.stack,
    source: event.filename,
    line: event.lineno,
    col: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  send({
    ...baseInfo(),
    type: "unhandledrejection",
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

const originalConsoleError = console.error.bind(console);
console.error = (...args) => {
  originalConsoleError(...args);
  send({
    ...baseInfo(),
    type: "console.error",
    message: args
      .map((a) => (a instanceof Error ? a.stack || a.message : typeof a === "string" ? a : safeStringify(a)))
      .join(" "),
  });
};
