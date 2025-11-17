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
 * Entité pour gérer les demandes d'export de données (Article 20 RGPD)
 *
 * Droit à la portabilité des données
 */
@Entity('data_export_requests')
export class DataExportRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
  })
  status: string;

  // Format demandé (JSON, CSV, PDF)
  @Column({ default: 'JSON' })
  format: string;

  // URL du fichier généré
  @Column({ nullable: true })
  fileUrl: string;

  // Date d'expiration du fichier (7 jours)
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  // Raison de l'échec si applicable
  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
