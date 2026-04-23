import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchNotificationTypes1776900800000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'team_invite'`);
    await queryRunner.query(`ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'match_scheduled'`);
    await queryRunner.query(`ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'match_result'`);
    await queryRunner.query(`ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'tournament_update'`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "metadata" jsonb NULL`);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values; metadata column retained for safety
  }
}
