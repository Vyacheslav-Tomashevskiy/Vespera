import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateApiKeyRotationHistoryTable1771000000001 implements MigrationInterface {
  name = 'CreateApiKeyRotationHistoryTable1771000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'api_key_rotation_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'api_key_id', type: 'uuid', isNullable: false },
          { name: 'user_id', type: 'uuid', isNullable: false },
          {
            name: 'old_key_hash',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'new_key_hash',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'old_key_prefix',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'new_key_prefix',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'rotated_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'NOW()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'api_key_rotation_history',
      new TableIndex({
        name: 'IDX_api_key_rotation_history_api_key_id',
        columnNames: ['api_key_id'],
      }),
    );

    await queryRunner.createIndex(
      'api_key_rotation_history',
      new TableIndex({
        name: 'IDX_api_key_rotation_history_user_id',
        columnNames: ['user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'api_key_rotation_history',
      'IDX_api_key_rotation_history_user_id',
    );
    await queryRunner.dropIndex(
      'api_key_rotation_history',
      'IDX_api_key_rotation_history_api_key_id',
    );
    await queryRunner.dropTable('api_key_rotation_history');
  }
}
