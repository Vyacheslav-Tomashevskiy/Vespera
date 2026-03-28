import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePropertyListingDraftTable1774300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'property_listing_drafts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'landlord_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'data',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'current_step',
            type: 'int',
            isNullable: false,
            default: 1,
          },
          {
            name: 'completed_steps',
            type: 'text',
            isNullable: false,
            default: "''",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'property_listing_drafts',
      new TableIndex({
        name: 'IDX_DRAFT_LANDLORD',
        columnNames: ['landlord_id'],
      }),
    );

    await queryRunner.createIndex(
      'property_listing_drafts',
      new TableIndex({
        name: 'IDX_DRAFT_LANDLORD_EXPIRES',
        columnNames: ['landlord_id', 'expires_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('property_listing_drafts');
  }
}
