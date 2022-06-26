const axios = require("axios");
const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL);
const AUTH = {
    headers: {
        "x-api-key": "2572d7d9-d902-49a3-9582-be88a484f552"
    }
};

const WHALE_LIST = [
    "0xE052113bd7D7700d623414a0a4585BCaE754E9d5",
    "0x052564eB0fd8b340803dF55dEf89c25C432f43f4",
    "0x0ed1e02164a2a9fad7a9f9b5b9e71694c3fad7f2",
    "0xC665A60F22dDa926B920DEB8FFAC0EF9D8a17460",
    "0x0E9AED5c7721c642A032812C2c4816f7d6cB87d7",
    "0x53aED391f71BC67d8b5b05a3851f46E742A74768",
    "0x6186290B28D511bFF971631c916244A9fC539cfE",
    "0x65Ba4f92D7DFA813DdBd849D9Faf38a723Dd9b12",
    "0xe1D29d0a39962a9a8d2A297ebe82e166F8b8EC18",
    "0x3612b2e93b49F6c797066cA8c38b7f522b32c7cb"
];

export default async function handler(req, res) {
    const data = await redis.get("predictions");
    if (data) return res.status(200).json(JSON.parse(data));

    let contractToRank = {};
    for (const whale of WHALE_LIST) {
        const { data } = await axios.get(
            `https://api.reservoir.tools/users/${whale}/activity/v1?limit=20`,
            AUTH
        );

        for (const activityTx of data.activities) {
            const collectionId = activityTx.collection.collectionId;

            if (activityTx.type === "transfer" && collectionId && collectionId.length == 42) {
                if (collectionId in contractToRank) {
                    contractToRank[collectionId] = contractToRank[collectionId] + 1;
                } else {
                    contractToRank[collectionId] = 1;
                }
            }
        }
    }

    let rankedSorted = [];
    for (const [contract, rank] of Object.entries(contractToRank)) {
        const { data: { collection }} = await axios.get(
            `https://api.reservoir.tools/collection/v2?id=${contract}`,
            AUTH
        );
        rankedSorted.push({ contract, rank, details: {
            name: collection.name,
            imageUrl: collection.metadata.imageUrl
        } });
    }

    rankedSorted = rankedSorted.sort((a, b) => b.rank - a.rank);

    await redis.set("predictions", JSON.stringify(rankedSorted), "EX", 600);

    res.status(200).json(rankedSorted);
}