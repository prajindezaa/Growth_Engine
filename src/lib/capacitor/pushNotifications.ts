import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from "@capacitor/push-notifications";

export interface PushNotificationService {
  init: (onNotificationReceived?: (notification: PushNotificationSchema) => void) => Promise<string | null>;
  requestPermissions: () => Promise<boolean>;
}

class PushNotificationManager implements PushNotificationService {
  private registeredToken: string | null = null;

  async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      if (typeof window !== "undefined" && "Notification" in window) {
        const perm = await Notification.requestPermission();
        return perm === "granted";
      }
      return false;
    }

    try {
      const status = await PushNotifications.requestPermissions();
      return status.receive === "granted";
    } catch (err) {
      console.warn("[PushNotifications] Permission request error:", err);
      return false;
    }
  }

  async init(
    onNotificationReceived?: (notification: PushNotificationSchema) => void
  ): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) {
      // Running in standard web browser
      console.info("[PushNotifications] Web platform detected; in-app notification center active.");
      return null;
    }

    try {
      const granted = await this.requestPermissions();
      if (!granted) {
        console.warn("[PushNotifications] Permission not granted");
        return null;
      }

      // Register device for FCM
      await PushNotifications.register();

      // Token listener
      PushNotifications.addListener("registration", (token: Token) => {
        console.info("[PushNotifications] FCM Device Token registered:", token.value);
        this.registeredToken = token.value;
      });

      PushNotifications.addListener("registrationError", (error: any) => {
        console.error("[PushNotifications] FCM Registration error:", error);
      });

      // Foreground notification listener
      PushNotifications.addListener(
        "pushNotificationReceived",
        (notification: PushNotificationSchema) => {
          console.info("[PushNotifications] Notification received:", notification);
          if (onNotificationReceived) {
            onNotificationReceived(notification);
          }
        }
      );

      // Notification action / tap listener
      PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action: ActionPerformed) => {
          console.info("[PushNotifications] Notification tapped:", action);
          const data = action.notification.data;
          if (data && data.url && typeof window !== "undefined") {
            window.location.href = data.url;
          }
        }
      );

      return this.registeredToken;
    } catch (err) {
      console.error("[PushNotifications] Init error:", err);
      return null;
    }
  }
}

export const pushNotifications = new PushNotificationManager();
