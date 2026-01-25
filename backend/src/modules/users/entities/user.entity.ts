import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RentAgreement } from '../../rent/entities/rent-contract.entity';

export type UserRole = 'landlord' | 'tenant' | 'agent' | 'admin';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'deactivated';
export type KYCStatus = 'not_started' | 'pending' | 'approved' | 'rejected';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar' })
  role: UserRole;

  @Column({ type: 'varchar', default: 'pending' })
  status: UserStatus;

  // Stellar integration
  @Column({ nullable: true, unique: true })
  stellarPublicKey?: string;

  @Column({ default: false })
  stellarAccountCreated: boolean;

  // Profile
  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  profileImageUrl?: string;

  // Verification
  @Column({ default: false })
  emailVerified: boolean;

  @Column({ default: false })
  phoneVerified: boolean;

  @Column({ type: 'varchar', default: 'not_started' })
  kycStatus: KYCStatus;

  // Authentication & Security
  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ nullable: true })
  resetTokenExpiresAt?: Date;

  @Column({ default: false })
  accountLocked: boolean;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ nullable: true })
  lockedUntil?: Date;

  // Metadata
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  // Relations
  @OneToMany(() => RentAgreement, (contract) => contract.tenantId)
  contracts: RentAgreement[];
}