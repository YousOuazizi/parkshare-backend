import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User, VerificationLevel } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { SmsService } from '../../providers/sms/sms.service';
import { StorageService } from '../../providers/storage/storage.service';
import { VerificationLevelChangedEvent } from './events/verification-level-changed.event';
import { v4 as uuidv4 } from 'uuid';
import { DocumentType } from './dto/upload-id-document.dto';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private usersService: UsersService,
    private smsService: SmsService,
    private storageService: StorageService,
    private eventEmitter: EventEmitter2,
  ) {}

  async sendEmailVerification(userId: string): Promise<void> {
    const user = await this.usersService.findOne(userId);

    if (user.verificationLevel >= VerificationLevel.LEVEL_1) {
      throw new ConflictException('Email déjà vérifié');
    }

    const token = uuidv4();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    await this.userRepository.update(userId, {
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    });

    console.log(`Email de vérification pour ${user.email}: ${token}`);
  }

  async verifyEmail(token: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new NotFoundException('Token de vérification invalide');
    }

    if (
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException('Token de vérification expiré');
    }

    const previousLevel = user.verificationLevel;

    user.verified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    user.verificationLevel = Math.max(
      user.verificationLevel,
      VerificationLevel.LEVEL_1,
    );

    const savedUser = await this.userRepository.save(user);

    this.emitVerificationLevelChange(
      user.id,
      previousLevel,
      savedUser.verificationLevel,
    );

    return savedUser;
  }

  async requestPhoneVerification(userId: string, phone: string): Promise<void> {
    const user = await this.usersService.findOne(userId);

    if (user.verificationLevel >= VerificationLevel.LEVEL_2) {
      throw new ConflictException('Téléphone déjà vérifié');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);

    if (user.phone !== phone) {
      user.phone = phone;
      user.phoneVerified = false;
    }

    user.phoneVerificationCode = code;
    user.phoneVerificationExpires = expires;

    await this.userRepository.save(user);
    await this.smsService.sendVerificationCode(phone, code);
  }

  async verifyPhone(userId: string, code: string): Promise<User> {
    const user = await this.usersService.findOne(userId);

    if (user.phoneVerificationCode !== code) {
      throw new BadRequestException('Code de vérification incorrect');
    }

    if (
      !user.phoneVerificationExpires ||
      user.phoneVerificationExpires < new Date()
    ) {
      throw new BadRequestException('Code de vérification expiré');
    }

    const previousLevel = user.verificationLevel;

    user.phoneVerified = true;
    user.phoneVerificationCode = null;
    user.phoneVerificationExpires = null;
    user.verificationLevel = Math.max(
      user.verificationLevel,
      VerificationLevel.LEVEL_2,
    );

    const savedUser = await this.userRepository.save(user);

    this.emitVerificationLevelChange(
      user.id,
      previousLevel,
      savedUser.verificationLevel,
    );

    return savedUser;
  }

  async uploadIdDocument(
    userId: string,
    documentType: DocumentType,
    file: Buffer,
    mimeType: string,
    notes?: string,
  ): Promise<User> {
    const user = await this.usersService.findOne(userId);

    if (user.verificationLevel < VerificationLevel.LEVEL_2) {
      throw new UnauthorizedException(
        "Vous devez d'abord vérifier votre téléphone",
      );
    }

    const uploadResult = await this.storageService.uploadFile(
      file,
      mimeType,
      `verification/${userId}`,
    );

    switch (documentType) {
      case DocumentType.ID_FRONT:
        user.idDocumentFront = uploadResult.key;
        break;
      case DocumentType.ID_BACK:
        user.idDocumentBack = uploadResult.key;
        break;
      case DocumentType.ADDRESS_PROOF:
        user.addressProofDocument = uploadResult.key;
        break;
      case DocumentType.SELFIE:
        user.selfieImage = uploadResult.key;
        break;
    }

    if (notes) {
      user.verificationNotes = notes;
    }

    return this.userRepository.save(user);
  }

  async approveIdVerification(userId: string, adminId: string): Promise<User> {
    const user = await this.usersService.findOne(userId);
    const admin = await this.usersService.findOne(adminId);

    if (admin.role !== 'admin') {
      throw new UnauthorizedException(
        "Vous n'êtes pas autorisé à effectuer cette action",
      );
    }

    if (!user.idDocumentFront || !user.idDocumentBack || !user.selfieImage) {
      throw new BadRequestException(
        "Tous les documents requis n'ont pas été fournis",
      );
    }

    const previousLevel = user.verificationLevel;

    user.idVerified = true;
    user.verificationLevel = Math.max(
      user.verificationLevel,
      VerificationLevel.LEVEL_3,
    );

    const savedUser = await this.userRepository.save(user);

    this.emitVerificationLevelChange(
      user.id,
      previousLevel,
      savedUser.verificationLevel,
    );

    return savedUser;
  }

  async approveAdvancedVerification(
    userId: string,
    adminId: string,
  ): Promise<User> {
    const user = await this.usersService.findOne(userId);
    const admin = await this.usersService.findOne(adminId);

    if (admin.role !== 'admin') {
      throw new UnauthorizedException(
        "Vous n'êtes pas autorisé à effectuer cette action",
      );
    }

    if (!user.idVerified) {
      throw new BadRequestException(
        "La vérification d'identité doit être approuvée d'abord",
      );
    }

    if (!user.addressProofDocument) {
      throw new BadRequestException("Une preuve d'adresse est requise");
    }

    const previousLevel = user.verificationLevel;

    user.advancedVerified = true;
    user.verificationLevel = VerificationLevel.LEVEL_4;

    const savedUser = await this.userRepository.save(user);

    this.emitVerificationLevelChange(
      user.id,
      previousLevel,
      savedUser.verificationLevel,
    );

    return savedUser;
  }

  async checkVerificationLevel(
    userId: string,
    requiredLevel: VerificationLevel,
  ): Promise<boolean> {
    const user = await this.usersService.findOne(userId);
    return user.verificationLevel >= requiredLevel;
  }

  async getVerificationInfo(userId: string): Promise<any> {
    const user = await this.usersService.findOne(userId);

    return {
      verificationLevel: user.verificationLevel,
      emailVerified: user.verified,
      phoneVerified: user.phoneVerified,
      idVerified: user.idVerified,
      advancedVerified: user.advancedVerified,
      documentsUploaded: {
        idFront: !!user.idDocumentFront,
        idBack: !!user.idDocumentBack,
        addressProof: !!user.addressProofDocument,
        selfie: !!user.selfieImage,
      },
      nextSteps: this.getNextVerificationSteps(user),
    };
  }

  private getNextVerificationSteps(user: User): string[] {
    const steps: string[] = [];

    if (!user.verified) {
      steps.push('Vérifiez votre adresse email');
    }

    if (user.verificationLevel < VerificationLevel.LEVEL_2) {
      steps.push('Vérifiez votre numéro de téléphone');
    }

    if (user.verificationLevel < VerificationLevel.LEVEL_3) {
      if (!user.idDocumentFront)
        steps.push("Téléchargez le recto de votre pièce d'identité");
      if (!user.idDocumentBack)
        steps.push("Téléchargez le verso de votre pièce d'identité");
      if (!user.selfieImage)
        steps.push("Téléchargez un selfie avec votre pièce d'identité");
      if (
        user.idDocumentFront &&
        user.idDocumentBack &&
        user.selfieImage &&
        !user.idVerified
      ) {
        steps.push(
          'En attente de vérification de votre identité par notre équipe',
        );
      }
    }

    if (user.verificationLevel < VerificationLevel.LEVEL_4) {
      if (!user.addressProofDocument)
        steps.push('Téléchargez un justificatif de domicile');
      if (user.addressProofDocument && !user.advancedVerified) {
        steps.push('En attente de vérification avancée par notre équipe');
      }
    }

    return steps;
  }

  private emitVerificationLevelChange(
    userId: string,
    previousLevel: VerificationLevel,
    newLevel: VerificationLevel,
  ) {
    if (previousLevel !== newLevel) {
      this.eventEmitter.emit(
        'verification.level_changed',
        new VerificationLevelChangedEvent(userId, previousLevel, newLevel),
      );
    }
  }
}
