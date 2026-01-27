import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateUserSchema1769263200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'password',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'first_name',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'last_name',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'phone_number',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'avatar_url',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'role',
        type: 'varchar',
        length: '50',
        default: "'user'",
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'email_verified',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'verification_token',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'reset_token',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'reset_token_expires',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'failed_login_attempts',
        type: 'integer',
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'account_locked_until',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'last_login_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'is_active',
        type: 'boolean',
        default: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'refresh_token',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'updated_at',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'password');
    await queryRunner.dropColumn('users', 'first_name');
    await queryRunner.dropColumn('users', 'last_name');
    await queryRunner.dropColumn('users', 'phone_number');
    await queryRunner.dropColumn('users', 'avatar_url');
    await queryRunner.dropColumn('users', 'role');
    await queryRunner.dropColumn('users', 'email_verified');
    await queryRunner.dropColumn('users', 'verification_token');
    await queryRunner.dropColumn('users', 'reset_token');
    await queryRunner.dropColumn('users', 'reset_token_expires');
    await queryRunner.dropColumn('users', 'failed_login_attempts');
    await queryRunner.dropColumn('users', 'account_locked_until');
    await queryRunner.dropColumn('users', 'last_login_at');
    await queryRunner.dropColumn('users', 'is_active');
    await queryRunner.dropColumn('users', 'refresh_token');
    await queryRunner.dropColumn('users', 'updated_at');
  }
}
