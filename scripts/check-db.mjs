// Quick connection check: prints record counts from the configured database.
//   node --env-file=.env scripts/with-session-pooler.mjs node scripts/check-db.mjs
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const [users, classes, students, payments] = await Promise.all([db.user.count(), db.class.count(), db.student.count(), db.payment.count()]);
console.log({ users, classes, students, payments });
await db.$disconnect();
