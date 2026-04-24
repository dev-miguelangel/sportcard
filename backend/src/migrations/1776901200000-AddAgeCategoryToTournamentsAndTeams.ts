import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgeCategoryToTournamentsAndTeams1776901200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tournament ADD COLUMN IF NOT EXISTS min_age INT`);
    await queryRunner.query(`ALTER TABLE tournament ADD COLUMN IF NOT EXISTS max_age INT`);
    await queryRunner.query(`ALTER TABLE tournament ADD COLUMN IF NOT EXISTS allow_individual BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE team ADD COLUMN IF NOT EXISTS min_age INT`);
    await queryRunner.query(`ALTER TABLE team ADD COLUMN IF NOT EXISTS max_age INT`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE team DROP COLUMN IF EXISTS max_age`);
    await queryRunner.query(`ALTER TABLE team DROP COLUMN IF EXISTS min_age`);
    await queryRunner.query(`ALTER TABLE tournament DROP COLUMN IF EXISTS allow_individual`);
    await queryRunner.query(`ALTER TABLE tournament DROP COLUMN IF EXISTS max_age`);
    await queryRunner.query(`ALTER TABLE tournament DROP COLUMN IF EXISTS min_age`);
  }
}
