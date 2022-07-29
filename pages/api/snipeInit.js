import snipeStartQueue from "./queues/snipeStart";
import listedTokenCheckQueue from "./queues/listedTokenCheck";
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

  var body = req.body;
  var customId = `${body.address}` + ":" + `${body.contract}`;

  await client.query(
    `INSERT INTO snipe_tracking (id, quantity) VALUES ('${customId}', 0)`
  );

  await snipeStartQueue.enqueue(body);

  await listedTokenCheckQueue.enqueue(body, {
    id: customId,
  });

  res.status(200).end();
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};
