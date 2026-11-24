// Notification Channel Interface and Pluggable Notification Hub

export interface NotificationPayload {
  societyId: string;
  userId: string;
  recipientContact: {
    email?: string | null;
    phone?: string | null;
  };
  title: string;
  message: string;
  type: 'INVOICE_GENERATED' | 'PAYMENT_RECEIVED' | 'PAYMENT_OVERDUE' | 'COMPLAINT_UPDATE' | 'VISITOR_ARRIVAL' | 'NOTICE_PUBLISHED' | 'POLL_CREATED' | 'SYSTEM_ALERT';
  data?: Record<string, any>;
}

export interface NotificationChannel {
  name: string;
  send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class InAppNotificationChannel implements NotificationChannel {
  name = 'IN_APP';

  async send(payload: NotificationPayload) {
    // In-app notifications are stored directly in the database
    // The caller or service creates the Notification record
    return { success: true, messageId: `inapp-${Date.now()}` };
  }
}

export class EmailNotificationChannel implements NotificationChannel {
  name = 'EMAIL';

  async send(payload: NotificationPayload) {
    if (!payload.recipientContact.email) {
      return { success: false, error: 'Recipient has no email' };
    }
    // Simulation / Resend / Nodemailer dispatch
    console.log(`[Email dispatched] To: ${payload.recipientContact.email} | Subject: ${payload.title} | ${payload.message}`);
    return { success: true, messageId: `email-${Date.now()}` };
  }
}

export class SmsNotificationChannel implements NotificationChannel {
  name = 'SMS';

  async send(payload: NotificationPayload) {
    if (!payload.recipientContact.phone) {
      return { success: false, error: 'Recipient has no phone number' };
    }
    // Ready for MSG91 / Twilio / Kaleyra
    console.log(`[SMS dispatched] To: ${payload.recipientContact.phone} | ${payload.title}: ${payload.message}`);
    return { success: true, messageId: `sms-${Date.now()}` };
  }
}

export class WhatsAppNotificationChannel implements NotificationChannel {
  name = 'WHATSAPP';

  async send(payload: NotificationPayload) {
    if (!payload.recipientContact.phone) {
      return { success: false, error: 'Recipient has no phone number' };
    }
    // Future integration ready: Meta Cloud API / Gupshup / Wati
    console.log(`[WhatsApp dispatched] To: ${payload.recipientContact.phone} | Template: ${payload.type} | Content: ${payload.message}`);
    return { success: true, messageId: `wa-${Date.now()}` };
  }
}

export class NotificationHub {
  private channels: Map<string, NotificationChannel> = new Map();

  constructor() {
    this.registerChannel(new InAppNotificationChannel());
    this.registerChannel(new EmailNotificationChannel());
    this.registerChannel(new SmsNotificationChannel());
    this.registerChannel(new WhatsAppNotificationChannel());
  }

  registerChannel(channel: NotificationChannel) {
    this.channels.set(channel.name, channel);
  }

  async dispatch(channels: ('IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP')[], payload: NotificationPayload) {
    const results: Record<string, any> = {};
    for (const channelName of channels) {
      const channel = this.channels.get(channelName);
      if (channel) {
        try {
          results[channelName] = await channel.send(payload);
        } catch (err: any) {
          results[channelName] = { success: false, error: err.message };
        }
      }
    }
    return results;
  }
}

export const notificationHub = new NotificationHub();

