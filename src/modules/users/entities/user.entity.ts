import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  USER = 'user',
  OWNER = 'owner',
  ADMIN = 'admin',
}

export enum VerificationLevel {
  LEVEL_0 = 0, // Compte créé (email non vérifié)
  LEVEL_1 = 1, // Email vérifié
  LEVEL_2 = 2, // Téléphone vérifié
  LEVEL_3 = 3, // Document d'identité vérifié
  LEVEL_4 = 4, // Vérification avancée
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ type: 'varchar' })
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({
    type: 'enum',
    enum: VerificationLevel,
    default: VerificationLevel.LEVEL_0,
  })
  verificationLevel: VerificationLevel;

  @Column({ type: 'text', nullable: true })
  @Exclude({ toPlainOnly: true })
  refreshToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Exclude({ toPlainOnly: true })
  stripeCustomerId: string;

  @Column({ type: 'varchar', nullable: true })
  emailVerificationToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpires: Date | null;

  @Column({ type: 'varchar', nullable: true })
  phoneVerificationCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  phoneVerificationExpires: Date | null;

  @Column({ type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  idDocumentFront: string;

  @Column({ type: 'varchar', nullable: true })
  idDocumentBack: string;

  @Column({ type: 'varchar', nullable: true })
  addressProofDocument: string;

  @Column({ type: 'varchar', nullable: true })
  selfieImage: string;

  @Column({ type: 'text', nullable: true })
  verificationNotes: string;

  @Column({ type: 'boolean', default: false })
  idVerified: boolean;

  @Column({ type: 'boolean', default: false })
  advancedVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
