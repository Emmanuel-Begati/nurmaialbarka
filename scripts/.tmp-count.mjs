import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const r = await db.$queryRawUnsafe(`SELECT (SELECT count(*) FROM "public"."User")::int users, (SELECT count(*) FROM "public"."Student")::int students, (SELECT count(*) FROM "public"."Class")::int classes, (SELECT count(*) FROM "public"."AuditLog")::int audit,
 (SELECT count(*) FROM "nq_test"."Student")::int test_students, (SELECT count(*) FROM "nq_test"."Attendance")::int test_attendance`);
console.log(r[0]); await db.$disconnect();
