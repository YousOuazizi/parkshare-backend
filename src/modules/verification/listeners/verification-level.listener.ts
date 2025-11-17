import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { VerificationLevelChangedEvent } from '../../verification/events/verification-level-changed.event';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { NotificationType } from 'src/modules/notifications/entities/notification.entity';

@Injectable()
export class VerificationLevelListener {
  constructor(private notificationsService: NotificationsService) {}

  @OnEvent('verification.level_changed')
  async handleVerificationLevelChanged(event: VerificationLevelChangedEvent) {
    const levelNames = {
      0: 'Compte créé',
      1: 'Email vérifié',
      2: 'Téléphone vérifié',
      3: 'Identité vérifiée',
      4: 'Vérification avancée',
    };

    await this.notificationsService.create({
      userId: event.userId,
      type: NotificationType.SYSTEM_NOTIFICATION,
      title: 'Niveau de vérification mis à jour',
      content: `Félicitations ! Votre niveau de vérification a été mis à jour vers "${levelNames[event.newLevel]}". De nouvelles fonctionnalités sont maintenant disponibles.`,
      data: {
        previousLevel: event.previousLevel,
        newLevel: event.newLevel,
      },
    });
  }
}
