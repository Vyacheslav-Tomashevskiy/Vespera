import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Property } from './property.entity';

@Entity('property_availability')
@Unique(['propertyId', 'date'])
@Index(['propertyId', 'date'])
export class PropertyAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'property_id', type: 'uuid' })
  propertyId: string;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'boolean', default: true })
  available: boolean;

  @Column({
    name: 'custom_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  customPrice: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'blocked_by_booking_id', type: 'uuid', nullable: true })
  blockedByBookingId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
