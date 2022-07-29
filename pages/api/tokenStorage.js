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

  const data = JSON.parse(req.body);
  const tokens = data.tokens;
  const id = data.id;
  await client.query(
    `INSERT INTO token_data (id, tokens) VALUES ('${id}', '${tokens}')`
  );
  console.log("stored!");
  client.end();
  res.end();
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};
