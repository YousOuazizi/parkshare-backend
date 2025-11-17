import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  Column,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export abstract class BaseEntity {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T14:45:00Z',
  })
  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Version number for optimistic locking',
    example: 1,
  })
  @VersionColumn()
  version!: number;
}

export abstract class SoftDeleteEntity extends BaseEntity {
  @ApiProperty({
    description: 'Soft deletion timestamp',
    example: null,
    nullable: true,
  })
  @Column({
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  @Exclude({ toPlainOnly: true })
  deletedAt?: Date | null;

  @ApiProperty({
    description: 'Whether the entity is soft deleted',
    example: false,
  })
  @Column({ type: 'boolean', default: false })
  @Exclude({ toPlainOnly: true })
  isDeleted!: boolean;

  softDelete(): void {
    this.deletedAt = new Date();
    this.isDeleted = true;
  }

  restore(): void {
    this.deletedAt = null;
    this.isDeleted = false;
  }
}

export abstract class AuditableEntity extends SoftDeleteEntity {
  @Column({ type: 'uuid', nullable: true })
  @Exclude({ toPlainOnly: true })
  createdBy?: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Exclude({ toPlainOnly: true })
  updatedBy?: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Exclude({ toPlainOnly: true })
  deletedBy?: string | null;
}
