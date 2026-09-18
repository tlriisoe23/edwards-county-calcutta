import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
const [dir, dbGlobDir] = process.argv.slice(2);
const file = readdirSync(dbGlobDir).find(f => f.endsWith(".sqlite") && f !== "metadata.sqlite");
if (!file) throw new Error("no d1 sqlite in " + dbGlobDir);
const db = new DatabaseSync(dbGlobDir + "/" + file);
for (const f of readdirSync(dir).filter(f => f.endsWith(".sql")).sort()) {
  const sql = readFileSync(dir + "/" + f, "utf8").split(/-->\s*statement-breakpoint/).map(s => s.trim()).filter(Boolean);
  for (const st of sql) { try { db.exec(st); } catch (e) { console.log(f, "skip:", e.message.slice(0, 80)); } }
  console.log("applied", f);
}
console.log(db.prepare("select name from sqlite_master where type='table'").all().map(r => r.name).join(","));
