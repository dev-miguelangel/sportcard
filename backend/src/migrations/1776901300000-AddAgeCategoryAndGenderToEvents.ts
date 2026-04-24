import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgeCategoryAndGenderToEvents1776901300000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE event_gender_enum AS ENUM ('male', 'female', 'mixed', 'open')`);
    await queryRunner.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS min_age INT`);
    await queryRunner.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS max_age INT`);
    await queryRunner.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS gender event_gender_enum`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE events DROP COLUMN IF EXISTS gender`);
    await queryRunner.query(`ALTER TABLE events DROP COLUMN IF EXISTS max_age`);
    await queryRunner.query(`ALTER TABLE events DROP COLUMN IF EXISTS min_age`);
    await queryRunner.query(`DROP TYPE IF EXISTS event_gender_enum`);
  }
}
