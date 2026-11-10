import { PrismaClient } from "@prisma/client";
const db = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
let sql = "";
db.$on("query", (e) => { if (!sql && e.query.includes("User")) sql = e.query; });
await db.user.count();
console.log("first query:", sql.slice(0, 200));
const rows = await db.$queryRawUnsafe(`SELECT (SELECT count(*) FROM "public"."User")::int pub_users, (SELECT count(*) FROM "nq_test"."User")::int test_users,
  (SELECT last_value FROM "public"."User_id_seq")::int pub_seq, (SELECT last_value FROM "nq_test"."User_id_seq")::int test_seq,
  (SELECT is_called FROM "public"."User_id_seq") pub_called`);
console.log(rows[0]);
await db.$disconnect();
