import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PaymentMethod } from './payment-method.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @Column({ nullable: true })
  agreementId: string; // Reference to agreement

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0.0 })
  feeAmount: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  netAmount: number; // Will be computed

  @Column({ length: 3, default: 'NGN' })
  currency: string;

  @Column({ default: 'pending' })
  status: string; // pending, completed, failed, refunded, partial_refund

  @ManyToOne(() => PaymentMethod, { nullable: true })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  paymentMethodId: number;

  @Column({ nullable: true })
  referenceNumber: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column('decimal', { precision: 12, scale: 2, default: 0.0 })
  refundedAmount: number;

  @Column({ type: 'text', nullable: true })
  refundReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
