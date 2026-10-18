self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title = typeof payload.title === "string" ? payload.title : "Turtle Jr reminder";
  const body = typeof payload.body === "string" ? payload.body : "You have an update in your Life Dashboard.";
  const tag = typeof payload.tag === "string" ? payload.tag : "life-dashboard";
  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag,
    icon: "/newlogo-512.png",
    badge: "/newlogo-192.png",
    data: { url: payload.url === "/health" ? "/health" : "/health" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL("/health", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) return existing.focus().then(() => existing.navigate(destination));
    return self.clients.openWindow(destination);
  }));
});
