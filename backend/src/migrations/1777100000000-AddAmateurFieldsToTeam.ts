import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAmateurFieldsToTeam1777100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE team ADD COLUMN is_amateur BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE team ADD COLUMN team_id VARCHAR(10) UNIQUE NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE team ADD COLUMN icon_name VARCHAR(100) NOT NULL DEFAULT 'shield'`);
    await queryRunner.query(`ALTER TABLE team ADD COLUMN background_color VARCHAR(7) NOT NULL DEFAULT '#1e1e1e'`);
    await queryRunner.query(`ALTER TABLE team ADD COLUMN icon_color VARCHAR(7) NOT NULL DEFAULT '#00e87a'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE team DROP COLUMN IF EXISTS icon_color`);
    await queryRunner.query(`ALTER TABLE team DROP COLUMN IF EXISTS background_color`);
    await queryRunner.query(`ALTER TABLE team DROP COLUMN IF EXISTS icon_name`);
    await queryRunner.query(`ALTER TABLE team DROP COLUMN IF EXISTS team_id`);
    await queryRunner.query(`ALTER TABLE team DROP COLUMN IF EXISTS is_amateur`);
  }
}
