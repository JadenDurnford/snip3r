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
  const tokens = await client.query(
    `SELECT tokens FROM token_data WHERE id= '${id}'`
  );
  if (tokens.rowCount == 1) {
    client.end();
    const parsedTokens = JSON.parse(tokens.rows[0].tokens);
    res.status(200).json(parsedTokens);
  } else {
    client.end();
    res.status(200).json({});
  }
};
