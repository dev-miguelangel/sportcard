import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancelledTournamentStatus1777068200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "tournament_status_enum" ADD VALUE IF NOT EXISTS 'cancelled'`,
    );
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values; down is a no-op
  }
}
