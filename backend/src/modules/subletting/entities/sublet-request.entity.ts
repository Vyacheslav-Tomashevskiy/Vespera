import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SubletRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  REVOKED = 'revoked',
}

@Entity('sublet_requests')
@Index(['agreementId'])
@Index(['tenantId'])
@Index(['landlordId'])
@Index(['status'])
export class SubletRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agreement_id', type: 'uuid' })
  agreementId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'landlord_id', type: 'uuid' })
  landlordId: string;

  @Column({
    type: 'enum',
    enum: SubletRequestStatus,
    default: SubletRequestStatus.PENDING,
  })
  status: SubletRequestStatus;

  @Column({ name: 'requested_start_date', type: 'date' })
  requestedStartDate: Date;

  @Column({ name: 'requested_end_date', type: 'date' })
  requestedEndDate: Date;

  @Column({ name: 'max_days_per_year', type: 'int' })
  maxDaysPerYear: number;

  @Column({ name: 'tenant_share', type: 'decimal', precision: 5, scale: 2 })
  tenantShare: number;

  @Column({ name: 'landlord_share', type: 'decimal', precision: 5, scale: 2 })
  landlordShare: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'landlord_notes', type: 'text', nullable: true })
  landlordNotes: string | null;

  @Column({ name: 'responded_at', type: 'timestamp', nullable: true })
  respondedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
