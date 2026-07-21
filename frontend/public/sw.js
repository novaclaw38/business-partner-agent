self.addEventListener('push', (event) => {
  let data = { title: 'Viper', body: 'Check-in ready.' }
  try {
    data = event.data.json()
  } catch {
    // fall back to default
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Viper', {
      body: data.body || '',
      icon: '/icon.png',
      badge: '/icon.png',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus()
      }
      return self.clients.openWindow('/')
    })
  )
})
