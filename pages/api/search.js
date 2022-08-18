import axios from "axios";

export default async function handler(req, res) {
  const { name } = req.query;
  const { chain } = req.query;
  if (!name) {
    res.status(500).json({ error: "Missing query" });
  }
  var baseUrl;
  if (chain == "Ethereum") {
    baseUrl = process.env.API_BASE_URL;
  } else if (chain == "Rinkeby") {
    baseUrl = process.env.API_TEST_URL;
  }

  try {
    const {
      data: { collections },
    } = await axios.get(
      `https://${baseUrl}/search/collections/v1?name=${name}&limit=5`
    );
    res.status(200).json(collections);
  } catch (error) {
    res.status(500).json({ error: "Failed collecting from Reservoir" });
  }
}
