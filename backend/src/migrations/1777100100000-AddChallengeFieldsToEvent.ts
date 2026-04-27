import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChallengeFieldsToEvent1777100100000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE events ADD COLUMN challenger_team_id UUID NULL REFERENCES team(id) ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE events ADD COLUMN challenged_team_id UUID NULL REFERENCES team(id) ON DELETE SET NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE events DROP COLUMN IF EXISTS challenged_team_id`);
    await queryRunner.query(`ALTER TABLE events DROP COLUMN IF EXISTS challenger_team_id`);
  }
}
