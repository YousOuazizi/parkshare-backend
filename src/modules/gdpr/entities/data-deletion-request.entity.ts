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
 * Entité pour gérer le droit à l'oubli (Article 17 RGPD)
 *
 * Right to erasure ("right to be forgotten")
 */
@Entity('data_deletion_requests')
export class DataDeletionRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED'],
    default: 'PENDING',
  })
  status: string;

  // Raison de la demande (optionnel)
  @Column({ type: 'text', nullable: true })
  reason: string;

  // Email de l'utilisateur (pour contact)
  @Column()
  userEmail: string;

  // Raison du rejet si applicable
  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  // Date de traitement effectif
  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  // Admin qui a approuvé/rejeté
  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
