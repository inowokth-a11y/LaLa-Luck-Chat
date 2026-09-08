import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "./lib/supabase/server";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!; const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ref = new URL(url).hostname.split(".")[0];
const svc = createServiceClient();
const email = `e2e-cat-${Date.now()}@test.local`; const pw = "e2e-Pass1234";
const { data: cu, error: ce } = await svc.auth.admin.createUser({ email, password: pw, email_confirm: true });
if (ce) { console.log("createUser ERR", ce.message); process.exit(1); }
const uid = cu.user!.id;
const c = createClient(url, anon, { auth: { persistSession: false } });
const { data: si, error: se } = await c.auth.signInWithPassword({ email, password: pw });
if (se) { console.log("signin ERR", se.message); process.exit(1); }
const raw = "base64-" + Buffer.from(JSON.stringify(si.session)).toString("base64url");
const chunks: string[] = []; for (let i = 0; i < raw.length; i += 3180) chunks.push(raw.slice(i, i + 3180));
const cookie = chunks.length === 1 ? `sb-${ref}-auth-token=${chunks[0]}` : chunks.map((ch, i) => `sb-${ref}-auth-token.${i}=${ch}`).join("; ");
async function call(body: unknown) {
  const r = await fetch("http://localhost:3000/api/cat", { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
}
const t0 = Date.now();
const r1 = await call({ coat: "black_solid", eye: "green", catName: "ส้มโอ", ownerBirthDate: "1990-03-15" });
console.log("1st status:", r1.status, "| paid:", r1.json.paid, "| title:", r1.json.reading?.titleTh, "| chem:", r1.json.reading?.chemistry?.final_score, "|", ((Date.now()-t0)/1000).toFixed(1)+"s");
const reply: string = r1.json.reply ?? "";
console.log("=== REPLY ===\n" + reply.slice(0, 900));
const banned = /แมวร้าย|อัปมงคล|ให้โทษ|เสนียด|ไม่ควรเลี้ยง|โรค|ป่วย|รักษา|สัตวแพทย์/;
console.log("\nCHECK banned words:", banned.test(reply), "| mentions โกญจา:", reply.includes("โกญจา"));
const r2 = await call({ coat: "black_solid", eye: "green" });
console.log("2nd status:", r2.status, "|", (r2.json.message ?? "").slice(0, 80));
const { data: usage } = await svc.from("chat_usage_e").select("bucket, used").eq("auth_uid", uid);
console.log("usage:", JSON.stringify(usage));
await svc.from("chat_usage_e").delete().eq("auth_uid", uid);
await svc.auth.admin.deleteUser(uid);
console.log("cleanup done");
