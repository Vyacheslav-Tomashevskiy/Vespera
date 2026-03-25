import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('api_key_rotation_history')
export class ApiKeyRotationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  apiKeyId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 64 })
  oldKeyHash: string;

  @Column({ type: 'varchar', length: 64 })
  newKeyHash: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  oldKeyPrefix: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  newKeyPrefix: string | null;

  @CreateDateColumn()
  rotatedAt: Date;
}
