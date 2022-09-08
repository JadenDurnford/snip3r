import listedTokenCheck from "./queues/listedTokenCheck";
import { Client } from "pg";

export default async (req, res) => {
  const client = new Client({
    user: `${process.env.PGUSER}`,
    host: `${process.env.PGHOST}`,
    database: `${process.env.PGDATABASE}`,
    password: `${process.env.PGPASSWORD}`,
    port: process.env.PGPORT,
  });

  client.connect(function (err) {
    if (err) throw err;
  });

  const id = req.body;

  await listedTokenCheck.delete(id);
  await client.query(`DELETE FROM snip3r.snipe_tracking WHERE id= '${id}'`);
  console.log("notifications stopped");
  client.end();
  res.end();
};
