import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTeamIdColumnLength1777100200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "team" ALTER COLUMN "team_id" TYPE VARCHAR(11)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "team" ALTER COLUMN "team_id" TYPE VARCHAR(10)`);
  }
}
