import { Client } from "pg";
import axios from "axios";

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
  const { continuation } = req.query;

  const { data } = await axios.get(
    `https://${process.env.API_BASE_URL}/tokens/v4?collection=${id}&sortBy=tokenId&limit=50&continuation=${continuation}`,
    { headers: { "x-api-key": `${process.env.NEXT_PUBLIC_RESERVOIR_KEY}` } }
  );

  data.tokens.map((object) => {
    delete object["contract"];
    delete object["name"];
    delete object["media"];
    delete object["collection"];
    delete object["source"];
    delete object["topBidValue"];
    delete object["rarity"];
    delete object["owner"];
  });

  await fetch(`http://localhost:3000/api/pgTokenAdd?id=${id}`, {
    method: "POST",
    body: JSON.stringify(data.tokens),
  });

  client.end();
  res.status(200).json(data);
};
