import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddApiKeyRotationFields1771000000000 implements MigrationInterface {
  name = 'AddApiKeyRotationFields1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add expiresAt column with default of 90 days from now
    await queryRunner.addColumn(
      'api_keys',
      new TableColumn({
        name: 'expires_at',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    );

    // Add rotatedAt column
    await queryRunner.addColumn(
      'api_keys',
      new TableColumn({
        name: 'rotated_at',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    );

    // Add previousKeyHash column for tracking rotated keys
    await queryRunner.addColumn(
      'api_keys',
      new TableColumn({
        name: 'previous_key_hash',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
    );

    // Add isRotated column to track if this is a rotated key
    await queryRunner.addColumn(
      'api_keys',
      new TableColumn({
        name: 'is_rotated',
        type: 'boolean',
        default: false,
      }),
    );

    // Add status column for active/expired/revoked
    await queryRunner.addColumn(
      'api_keys',
      new TableColumn({
        name: 'status',
        type: 'varchar',
        length: '20',
        default: "'active'",
      }),
    );

    // Add index for expires_at for efficient expiration queries
    await queryRunner.query(
      'CREATE INDEX "IDX_api_keys_expires_at" ON "api_keys" ("expires_at")',
    );

    // Add index for status
    await queryRunner.query(
      'CREATE INDEX "IDX_api_keys_status" ON "api_keys" ("status")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_api_keys_status"');
    await queryRunner.query('DROP INDEX "IDX_api_keys_expires_at"');
    await queryRunner.dropColumn('api_keys', 'status');
    await queryRunner.dropColumn('api_keys', 'is_rotated');
    await queryRunner.dropColumn('api_keys', 'previous_key_hash');
    await queryRunner.dropColumn('api_keys', 'rotated_at');
    await queryRunner.dropColumn('api_keys', 'expires_at');
  }
}
