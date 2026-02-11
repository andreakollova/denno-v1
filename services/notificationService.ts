import { NotificationFrequency } from '../types';
import { updateLastNotification, getUserProfile } from './storageService';

export function isNotificationSupported(): boolean {
  // Bezpečný check, ktorý nespôsobí ReferenceError
  return typeof window !== "undefined" && !!(window as any).Notification;
}

export function getNotificationPermission(): string {
  if (!isNotificationSupported()) return "unsupported";
  try {
    return (window as any).Notification.permission;
  } catch (e) {
    return "unsupported";
  }
}

export async function requestNotificationPermission(): Promise<string> {
  if (!isNotificationSupported()) return "unsupported";
  try {
    return await (window as any).Notification.requestPermission();
  } catch (e) {
    console.error("Chyba pri žiadaní o notifikácie", e);
    return "unsupported";
  }
}

export function sendNotification(title: string, body: string) {
  if (!isNotificationSupported()) return;
  
  if (getNotificationPermission() === "granted") {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    
    try {
      const options = {
        body,
        icon: 'https://cdn.shopify.com/s/files/1/0804/4226/1839/files/54325342.png?v=1764569599',
        badge: 'https://cdn.shopify.com/s/files/1/0804/4226/1839/files/54325342.png?v=1764569599',
        tag: 'ai-digest-update'
      };
      
      // Volanie cez window konštruktor
      new (window as any).Notification(title, options);
      updateLastNotification();
    } catch (e) {
      console.error("Chyba pri odosielaní notifikácie", e);
    }
  }
}

export const checkAndTriggerNotification = () => {
  const profile = getUserProfile();
  const freq = profile.notificationFrequency;
  
  if (freq === NotificationFrequency.OFF) return;
  if (!isNotificationSupported() || getNotificationPermission() !== "granted") return;

  const now = Date.now();
  const last = profile.lastNotification || 0;
  const hoursSinceLast = (now - last) / (1000 * 60 * 60);
  const currentHour = new Date().getHours();

  let shouldNotify = false;
  let title = "Tvoj denný prehľad";
  let body = "Nové správy sú pripravené. Poď sa pozrieť, čo je nové.";

  switch (freq) {
    case NotificationFrequency.DAILY:
      if (currentHour >= 9 && hoursSinceLast > 20) {
        shouldNotify = true;
        title = "Ranný prehľad je hotový ☕";
        body = "Váš denný súhrn noviniek čaká. Začnite deň informovane.";
      }
      break;

    case NotificationFrequency.THREE_TIMES_DAY:
      if (hoursSinceLast > 3) {
         if (currentHour >= 9 && currentHour < 13) {
            shouldNotify = true;
            title = "Ranný update ☀️";
         } else if (currentHour >= 13 && currentHour < 18) {
            shouldNotify = true;
            title = "Poobedný briefing 🥪";
         } else if (currentHour >= 18) {
            shouldNotify = true;
            title = "Večerný súhrn 🌙";
         }
      }
      break;

    case NotificationFrequency.EVERY_OTHER:
      if (currentHour >= 9 && hoursSinceLast > 46) {
        shouldNotify = true;
        title = "Čerstvé novinky";
      }
      break;

    case NotificationFrequency.WEEKLY:
      const day = new Date().getDay();
      if (day === 1 && currentHour >= 9 && hoursSinceLast > 150) {
        shouldNotify = true;
        title = "Týždenný špeciál 📅";
        body = "Prehľad najdôležitejších udalostí za tento týždeň.";
      }
      break;
  }

  if (shouldNotify) {
    sendNotification(title, body);
  }
};