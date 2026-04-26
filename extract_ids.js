const fs = require("fs");
const content = fs.readFileSync("index.html", "utf8");
const ids = [];
const regex = /id="([^"]+)"/g;
let match;
while ((match = regex.exec(content)) !== null) {
    ids.push(match[1]);
}
const unique = [...new Set(ids)].sort();
console.log("ALL_UNIQUE_IDS");
unique.forEach(id => console.log(id));
console.log("TOTAL_UNIQUE", unique.length);
console.log("TOTAL_WITH_DUPLICATES", ids.length);
const counts = {};
ids.forEach(id => counts[id] = (counts[id] || 0) + 1);
const dups = Object.entries(counts).filter(([k,v]) => v > 1).sort((a,b) => a[0].localeCompare(b[0]));
if (dups.length) {
    console.log("DUPLICATES_FOUND");
    dups.forEach(([k,v]) => console.log(k, v));
} else {
    console.log("NO_DUPLICATES");
}
