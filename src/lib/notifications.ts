import { supabaseAdmin as supabase } from './supabase';

export type NotificationKind = 'new_album' | 'new_set';

export type NotificationData = {
  kind: NotificationKind;
  albumId?: string;
  typeId?: string;
};

export type NotificationPayload = {
  title: string;
  body: string;
  data?: NotificationData;
};

export type NotificationResult = {
  success: true;
  sent: number;
};

export async function sendPushNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const { data, error } = await supabase.functions.invoke('send-notification', { body: payload });

  if (error) {
    let message = error.message;
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const body = await context.json();
        if (body?.error) message = body.error;
      } catch {
        // el cuerpo del error no era JSON, se mantiene el mensaje por defecto
      }
    }
    throw new Error(message);
  }

  return data as NotificationResult;
}
