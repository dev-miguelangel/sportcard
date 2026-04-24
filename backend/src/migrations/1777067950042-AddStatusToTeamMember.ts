import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatusToTeamMember1777067950042 implements MigrationInterface {
    name = 'AddStatusToTeamMember1777067950042'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."team_member_status_enum" AS ENUM('invited', 'confirmed', 'rejected')`);
        await queryRunner.query(`ALTER TABLE "team_member" ADD "status" "public"."team_member_status_enum" NOT NULL DEFAULT 'invited'`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "share_token" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "share_token" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "tournament" ALTER COLUMN "share_token" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tournament" ALTER COLUMN "share_token" SET DEFAULT uuid_generate_v4()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tournament" ALTER COLUMN "share_token" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "tournament" ALTER COLUMN "share_token" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "share_token" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "events" ALTER COLUMN "share_token" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "team_member" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."team_member_status_enum"`);
    }

}
