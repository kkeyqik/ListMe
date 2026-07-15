const { Client } = require('pg');
const client = new Client({
  connectionString: "postgres://postgres:postgres@127.0.0.1:51214/template1?sslmode=disable"
});
console.log("Connecting to database at 127.0.0.1:51214...");
client.connect()
  .then(() => {
    console.log("SUCCESS: Connected to database!");
    client.end();
  })
  .catch(err => {
    console.error("ERROR CONNECTING TO DATABASE:", err);
  });
