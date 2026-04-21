import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnboardingFields1745193600000 implements MigrationInterface {
  name = 'AddOnboardingFields1745193600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "phone" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "birthDate" date`);
    await queryRunner.query(`ALTER TABLE "users" ADD "gender" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "city" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "sports" text[] NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE "users" ADD "bloodType" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "allergies" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "medicalConditions" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "medications" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "emergencyName" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "emergencyPhone" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "emergencyRelation" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emergencyRelation"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emergencyPhone"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emergencyName"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "medications"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "medicalConditions"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "allergies"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bloodType"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "sports"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "city"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "gender"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "birthDate"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
  }
}
