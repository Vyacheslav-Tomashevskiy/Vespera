import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sublet_bookings')
@Index(['bookingId'])
@Index(['agreementId'])
@Index(['tenantId'])
@Index(['landlordId'])
@Index(['guestId'])
export class SubletBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @Column({ name: 'agreement_id', type: 'uuid' })
  agreementId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'landlord_id', type: 'uuid' })
  landlordId: string;

  @Column({ name: 'guest_id', type: 'uuid' })
  guestId: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ name: 'tenant_earnings', type: 'decimal', precision: 10, scale: 2 })
  tenantEarnings: number;

  @Column({
    name: 'landlord_earnings',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  landlordEarnings: number;

  @Column({ name: 'platform_fee', type: 'decimal', precision: 10, scale: 2 })
  platformFee: number;

  @Column({ name: 'payout_processed', type: 'boolean', default: false })
  payoutProcessed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
