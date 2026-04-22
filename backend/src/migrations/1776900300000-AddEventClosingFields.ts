import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventClosingFields1776900300000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"
        ADD COLUMN IF NOT EXISTS "closing_notes" TEXT,
        ADD COLUMN IF NOT EXISTS "results"        TEXT
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"
        DROP COLUMN IF EXISTS "closing_notes",
        DROP COLUMN IF EXISTS "results"
    `);
  }
}
