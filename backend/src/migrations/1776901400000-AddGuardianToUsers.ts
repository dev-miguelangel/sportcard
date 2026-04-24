import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuardianToUsers1776901400000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS guardian_id UUID REFERENCES users(id) ON DELETE SET NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS guardian_id`);
  }
}
