import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_ai_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'preferred_city', type: 'varchar', nullable: true })
  preferredCity: string | null;

  @Column({
    name: 'max_budget',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  maxBudget: number | null;

  @Column({
    name: 'min_budget',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  minBudget: number | null;

  @Column({ type: 'int', nullable: true })
  bedrooms: number | null;

  @Column({ type: 'int', nullable: true })
  bathrooms: number | null;

  @Column({ name: 'preferred_type', type: 'varchar', nullable: true })
  preferredType: string | null;

  @Column({ name: 'pets_required', type: 'boolean', default: false })
  petsRequired: boolean;

  @Column({ name: 'parking_required', type: 'boolean', default: false })
  parkingRequired: boolean;

  @Column({ name: 'furnished_required', type: 'boolean', default: false })
  furnishedRequired: boolean;

  @Column({
    name: 'preferred_amenities',
    type: 'simple-array',
    nullable: true,
  })
  preferredAmenities: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
