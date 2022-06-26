const axios = require("axios");

export default async function handler(req, res) {
    const { name } = req.query;
    if (!name) {
        res.status(500).json({ error: "Missing query" });
    }

    try {
        const { data: { collections } } = await axios.get(`https://api.reservoir.tools/search/collections/v1?name=${name}&limit=5`)
        res.status(200).json(collections);
    } catch (error) {
        res.status(500).json({ error: "Failed collecting from Reservoir" })
    }
}