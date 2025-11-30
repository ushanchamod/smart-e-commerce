import * as schema from "./schema";
import { pgGenerate } from "drizzle-dbml-generator";

const out = "./schema.dbml";

pgGenerate({ schema, out });

console.log("✅ DBML file generated at", out);
