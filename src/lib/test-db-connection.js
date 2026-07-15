const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://postgres.qmmvtxsnejaizdyyqffe:Kanha%40211410@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
});
console.log("Connecting to Session Pooler at aws-1-ap-northeast-2.pooler.supabase.com:5432...");
client.connect()
  .then(() => {
    console.log("SUCCESS: Connected to Session Pooler!");
    client.end();
  })
  .catch(err => {
    console.error("ERROR CONNECTING TO SESSION POOLER:", err);
  });
