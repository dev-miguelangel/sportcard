import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeamTables1776900500000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "team" (
        "id"         uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "name"       varchar      NOT NULL,
        "sport"      varchar      NOT NULL,
        "coach_id"   uuid         NOT NULL,
        "logo_url"   varchar,
        "created_at" TIMESTAMP    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team" PRIMARY KEY ("id"),
        CONSTRAINT "FK_team_coach"
          FOREIGN KEY ("coach_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "team_member" (
        "id"        uuid      NOT NULL DEFAULT uuid_generate_v4(),
        "team_id"   uuid      NOT NULL,
        "user_id"   uuid      NOT NULL,
        "position"  varchar,
        "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team_member"            PRIMARY KEY ("id"),
        CONSTRAINT "UQ_team_member_team_user"  UNIQUE ("team_id", "user_id"),
        CONSTRAINT "FK_team_member_team"
          FOREIGN KEY ("team_id") REFERENCES "team"("id")  ON DELETE CASCADE,
        CONSTRAINT "FK_team_member_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "team_member"`);
    await queryRunner.query(`DROP TABLE "team"`);
  }
}
