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

  const { id } = req.query;
  const exists = await client.query(
    `SELECT EXISTS (SELECT FROM information_schema."tables" WHERE table_name = '${id}')`
  );
  if (!exists.rows[0].exists) {
    await client.query(
      `CREATE TABLE "${id}" AS SELECT * FROM token_data_sample`
    );
  }

  client.end();
  res.status(200).end();
};
