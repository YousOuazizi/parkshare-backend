import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsResult } from './interfaces/sms.interface';
import * as twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly client: twilio.Twilio;
  private readonly fromNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid =
      this.configService.get<string>('TWILIO_ACCOUNT_SID') ||
      'demo-account-sid';
    const authToken =
      this.configService.get<string>('TWILIO_AUTH_TOKEN') || 'demo-auth-token';
    this.fromNumber =
      this.configService.get<string>('TWILIO_PHONE_NUMBER') || '+15555555555';

    // En mode développement, créez un client mock si les clés ne sont pas fournies
    if (
      accountSid.startsWith('AC') &&
      authToken.length > 10 &&
      this.configService.get<string>('NODE_ENV') !== 'development'
    ) {
      this.client = twilio(accountSid, authToken);
    } else {
      this.logger.warn('Using mock Twilio client (no real SMS will be sent)');
      this.client = {
        messages: {
          create: async () => ({ sid: 'mock-message-sid' }),
        },
      } as any;
    }
  }

  async sendSms(to: string, body: string): Promise<SmsResult> {
    try {
      const message = await this.client.messages.create({
        body,
        from: this.fromNumber,
        to,
      });

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error) {
      this.logger.error(`Error sending SMS: ${error.message}`, error.stack);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendVerificationCode(to: string, code: string): Promise<SmsResult> {
    const message = `Votre code de vérification ParkShare est: ${code}. Il expire dans 10 minutes.`;
    return this.sendSms(to, message);
  }

  async sendBookingConfirmation(
    to: string,
    bookingId: string,
    parkingName: string,
    date: string,
  ): Promise<SmsResult> {
    const message = `Votre réservation ParkShare #${bookingId} pour "${parkingName}" le ${date} a été confirmée. Vérifiez l'application pour les détails.`;
    return this.sendSms(to, message);
  }

  async sendAccessCode(
    to: string,
    accessCode: string,
    parkingName: string,
  ): Promise<SmsResult> {
    const message = `Votre code d'accès pour "${parkingName}" est: ${accessCode}. Utilisez-le à l'entrée du parking.`;
    return this.sendSms(to, message);
  }
}
