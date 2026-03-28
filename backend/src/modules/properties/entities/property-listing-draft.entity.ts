import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface PhotoData {
  url: string;
  caption?: string;
  order: number;
}

export interface PropertyData {
  propertyType?: string;
  address?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  yearBuilt?: number;
  monthlyRent?: number;
  securityDeposit?: number;
  leaseTerm?: string;
  moveInDate?: Date | string;
  utilitiesIncluded?: string[];
  amenities?: string[];
  houseRules?: Record<string, boolean>;
  photos?: PhotoData[];
  propertyDescription?: string;
  neighborhoodDescription?: string;
  transportationInfo?: string;
  nearbyAmenities?: string;

  // Step 7
  availableFrom?: Date | string;
  blockedDates?: string[];
}

@Entity('property_listing_drafts')
@Index(['landlordId', 'expiresAt'])
export class PropertyListingDraft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'landlord_id', type: 'uuid' })
  landlordId: string;

  @Column({
    type: process.env.DB_TYPE === 'sqlite' ? 'text' : 'jsonb',
    default: {},
  })
  data: PropertyData;

  @Column({ name: 'current_step', type: 'int', default: 1 })
  currentStep: number;

  @Column({
    name: 'completed_steps',
    type: process.env.DB_TYPE === 'sqlite' ? 'text' : 'jsonb',
    default: [],
  })
  completedSteps: number[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;
}