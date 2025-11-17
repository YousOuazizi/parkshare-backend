import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Entité pour stocker les consentements RGPD
 *
 * Conforme à l'Article 7 du RGPD :
 * - Consent must be freely given, specific, informed and unambiguous
 * - Must be able to demonstrate consent
 * - Right to withdraw consent at any time
 */
@Entity('user_consents')
export class UserConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Type de consentement
  @Column({
    type: 'enum',
    enum: [
      'TERMS_AND_CONDITIONS', // Conditions générales
      'PRIVACY_POLICY', // Politique de confidentialité
      'MARKETING_EMAILS', // Emails marketing
      'ANALYTICS', // Cookies analytiques
      'THIRD_PARTY_SHARING', // Partage avec tierces parties
      'GEOLOCATION', // Géolocalisation
      'PUSH_NOTIFICATIONS', // Notifications push
    ],
  })
  consentType: string;

  // Consentement donné ou retiré
  @Column({ type: 'boolean', default: false })
  granted: boolean;

  // IP d'où le consentement a été donné
  @Column({ nullable: true })
  ipAddress: string;

  // User agent pour traçabilité
  @Column({ type: 'text', nullable: true })
  userAgent: string;

  // Version de la politique acceptée
  @Column({ nullable: true })
  policyVersion: string;

  // Date d'expiration (pour renouvellement)
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
