
import dns from "node:dns/promises";

console.log(await dns.lookup("google.com"));