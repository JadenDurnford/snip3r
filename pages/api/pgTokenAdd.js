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

  const tokens = JSON.parse(req.body);
  const { id } = req.query;
  await Promise.all(
    tokens.map(async (token) => {
      const data = await client.query(
        `SELECT COUNT("tokenId") FROM "${id}" WHERE "tokenId" = ${token.tokenId}`
      );
      if (data.rows[0].count == 0) {
        await client.query(
          `INSERT INTO "${id}" VALUES ('${token.tokenId}', '${token.image}', ${token.rarityRank})`
        );
      }
    })
  );

  client.end();
  res.status(200).end();
};
