import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserConsent } from './entities/user-consent.entity';
import { DataExportRequest } from './entities/data-export-request.entity';
import { DataDeletionRequest } from './entities/data-deletion-request.entity';
import { User } from '../users/entities/user.entity';
import { CreateConsentDto } from './dto/create-consent.dto';
import { RequestDataExportDto } from './dto/request-data-export.dto';
import { RequestDataDeletionDto } from './dto/request-data-deletion.dto';

/**
 * Service RGPD - Conformité GDPR
 *
 * Implémente les droits RGPD :
 * - Article 7 : Consentement
 * - Article 15 : Droit d'accès
 * - Article 17 : Droit à l'effacement
 * - Article 20 : Droit à la portabilité
 */
@Injectable()
export class GdprService {
  constructor(
    @InjectRepository(UserConsent)
    private consentRepository: Repository<UserConsent>,
    @InjectRepository(DataExportRequest)
    private exportRepository: Repository<DataExportRequest>,
    @InjectRepository(DataDeletionRequest)
    private deletionRepository: Repository<DataDeletionRequest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Enregistrer un consentement utilisateur
   */
  async recordConsent(
    userId: string,
    createConsentDto: CreateConsentDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<UserConsent> {
    const consent = this.consentRepository.create({
      userId,
      ...createConsentDto,
      ipAddress,
      userAgent,
    });

    return await this.consentRepository.save(consent);
  }

  /**
   * Obtenir tous les consentements d'un utilisateur
   */
  async getUserConsents(userId: string): Promise<UserConsent[]> {
    return await this.consentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Vérifier si un utilisateur a donné un consentement spécifique
   */
  async hasConsent(userId: string, consentType: string): Promise<boolean> {
    const consent = await this.consentRepository.findOne({
      where: {
        userId,
        consentType,
        granted: true,
      },
      order: { createdAt: 'DESC' },
    });

    if (!consent) return false;

    // Vérifier l'expiration
    if (consent.expiresAt && consent.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Retirer un consentement
   */
  async withdrawConsent(
    userId: string,
    consentType: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<UserConsent> {
    const consent = this.consentRepository.create({
      userId,
      consentType,
      granted: false,
      ipAddress,
      userAgent,
    });

    return await this.consentRepository.save(consent);
  }

  /**
   * Demander un export des données (Article 20 RGPD)
   */
  async requestDataExport(
    userId: string,
    requestDataExportDto: RequestDataExportDto,
  ): Promise<DataExportRequest> {
    // Vérifier si une demande est déjà en cours
    const existingRequest = await this.exportRepository.findOne({
      where: {
        userId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        "Une demande d'export est déjà en cours de traitement",
      );
    }

    const exportRequest = this.exportRepository.create({
      userId,
      format: requestDataExportDto.format || 'JSON',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
    });

    const savedRequest = await this.exportRepository.save(exportRequest);

    // TODO: Déclencher un job asynchrone pour générer l'export
    // this.eventEmitter.emit('gdpr.export.requested', { requestId: savedRequest.id });

    return savedRequest;
  }

  /**
   * Générer l'export des données utilisateur
   */
  async generateDataExport(requestId: string): Promise<any> {
    const request = await this.exportRepository.findOne({
      where: { id: requestId },
      relations: ['user'],
    });

    if (!request) {
      throw new NotFoundException("Demande d'export introuvable");
    }

    await this.exportRepository.update(requestId, { status: 'PROCESSING' });

    try {
      const user = await this.userRepository.findOne({
        where: { id: request.userId },
        relations: [
          'parkings',
          'bookings',
          'payments',
          'reviews',
          'notifications',
          'subscriptions',
        ],
      });

      if (!user) {
        throw new NotFoundException('Utilisateur introuvable');
      }

      // Exclure les données sensibles
      const { password, refreshToken, ...userData } = user as any;

      const exportData = {
        exportDate: new Date().toISOString(),
        user: userData,
        gdprConsents: await this.consentRepository.find({
          where: { userId: request.userId },
        }),
        // TODO: Ajouter d'autres données selon les besoins
      };

      // TODO: Générer le fichier et l'uploader sur S3
      // const fileUrl = await this.uploadExportFile(exportData, request.format);

      await this.exportRepository.update(requestId, {
        status: 'COMPLETED',
        // fileUrl,
      });

      return exportData;
    } catch (error) {
      await this.exportRepository.update(requestId, {
        status: 'FAILED',
        failureReason: error.message,
      });
      throw error;
    }
  }

  /**
   * Obtenir les demandes d'export d'un utilisateur
   */
  async getUserExportRequests(userId: string): Promise<DataExportRequest[]> {
    return await this.exportRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Demander la suppression des données (Article 17 RGPD - Droit à l'oubli)
   */
  async requestDataDeletion(
    userId: string,
    requestDataDeletionDto: RequestDataDeletionDto,
    userEmail: string,
  ): Promise<DataDeletionRequest> {
    // Vérifier si une demande est déjà en cours
    const existingRequest = await this.deletionRepository.findOne({
      where: {
        userId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'Une demande de suppression est déjà en cours de traitement',
      );
    }

    const deletionRequest = this.deletionRepository.create({
      userId,
      userEmail,
      reason: requestDataDeletionDto.reason,
      status: 'PENDING',
    });

    return await this.deletionRepository.save(deletionRequest);
  }

  /**
   * Approuver une demande de suppression (Admin)
   */
  async approveDeletionRequest(
    requestId: string,
    adminId: string,
  ): Promise<DataDeletionRequest> {
    const request = await this.deletionRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Demande de suppression introuvable');
    }

    await this.deletionRepository.update(requestId, {
      status: 'APPROVED',
      reviewedBy: adminId,
    });

    // TODO: Déclencher le processus de suppression
    // this.eventEmitter.emit('gdpr.deletion.approved', { requestId });

    const updated = await this.deletionRepository.findOne({
      where: { id: requestId },
    });
    if (!updated) {
      throw new NotFoundException(
        'Demande de suppression introuvable après mise à jour',
      );
    }
    return updated;
  }

  /**
   * Rejeter une demande de suppression (Admin)
   */
  async rejectDeletionRequest(
    requestId: string,
    adminId: string,
    rejectionReason: string,
  ): Promise<DataDeletionRequest> {
    const request = await this.deletionRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Demande de suppression introuvable');
    }

    await this.deletionRepository.update(requestId, {
      status: 'REJECTED',
      reviewedBy: adminId,
      rejectionReason,
    });

    const updated = await this.deletionRepository.findOne({
      where: { id: requestId },
    });
    if (!updated) {
      throw new NotFoundException(
        'Demande de suppression introuvable après mise à jour',
      );
    }
    return updated;
  }

  /**
   * Exécuter la suppression des données
   */
  async executeDeletion(requestId: string): Promise<void> {
    const request = await this.deletionRepository.findOne({
      where: { id: requestId },
    });

    if (!request || request.status !== 'APPROVED') {
      throw new BadRequestException(
        "La demande n'est pas approuvée ou introuvable",
      );
    }

    await this.deletionRepository.update(requestId, { status: 'PROCESSING' });

    try {
      // Supprimer ou anonymiser les données
      // Note: Certaines données doivent être conservées pour obligations légales
      const user = await this.userRepository.findOne({
        where: { id: request.userId },
      });

      if (user) {
        // Anonymiser au lieu de supprimer complètement
        await this.userRepository.update(request.userId, {
          email: `deleted_${request.userId}@parkshare.com`,
          firstName: 'Deleted',
          lastName: 'User',
        } as any);

        // Supprimer les données sensibles
        // TODO: Supprimer photos, documents, etc.
      }

      await this.deletionRepository.update(requestId, {
        status: 'COMPLETED',
        processedAt: new Date(),
      });
    } catch (error) {
      await this.deletionRepository.update(requestId, {
        status: 'REJECTED',
        rejectionReason: error.message,
      });
      throw error;
    }
  }

  /**
   * Obtenir toutes les demandes de suppression (Admin)
   */
  async getAllDeletionRequests(): Promise<DataDeletionRequest[]> {
    return await this.deletionRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtenir les demandes de suppression d'un utilisateur
   */
  async getUserDeletionRequests(
    userId: string,
  ): Promise<DataDeletionRequest[]> {
    return await this.deletionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
