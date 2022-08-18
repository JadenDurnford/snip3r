import { Queue } from "quirrel/next";
import axios from "axios";
import tokenListedNotif from "./tokenListed";
import { Client } from "pg";
import EpnsSDK from "@epnsproject/backend-sdk-staging";
import { ethers } from "ethers";

export default Queue("api/queues/listedTokenCheck", async (notifData) => {
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

  const epnsSdk = new EpnsSDK(process.env.CHANNEL_PK);

  const walletAddress = notifData.address;
  const contractAddress = notifData.contract;
  const id = `${walletAddress}` + ":" + `${contractAddress}`;
  const data = JSON.parse(notifData.data);
  const traitsSelected = JSON.parse(notifData.traits);
  const rarityMin = notifData.raritymin;
  const rarityMax = notifData.raritymax;
  const specificid = notifData.idvalue;
  const chain = notifData.chain;
  var reservoirUrl;
  var alchemyUrl;
  if (chain == "Ethereum") {
    reservoirUrl = "api.reservoir.tools";
    alchemyUrl = `https://eth.alchemyapi.io/v2/${process.env.ALCHEMY_MAINNET}`;
  } else if (chain == "Rinkeby") {
    reservoirUrl = "api-rinkeby.reservoir.tools";
    alchemyUrl = `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_TESTNET}`;
  }

  const {
    data: { attributes },
  } = await axios.get(
    `https://${reservoirUrl}/collections/${contractAddress}/attributes/static/v1`,
    { headers: { "x-api-key": `${process.env.NEXT_PUBLIC_RESERVOIR_KEY}` } }
  );
  const attdata = attributes;

  const pushNotificationtitle = `Your snipe on ${data.name} was created`;
  const pushNotificationMessage = `Your snipe with parameters: 
  Max Price= ${notifData.price}
  Quantity= ${notifData.quantity}
  Traits Selected=${Object.entries(traitsSelected).map((trait) => {
    return " " + trait[0] + ": " + trait[1];
  })}`;
  const notificationTitle = `Your snipe on ${data.name} was created`;
  const notificationMessage = `Your snipe with parameters: 
  Max Price= ${notifData.price}
  Quantity= ${notifData.quantity}
  Traits Selected=${Object.entries(traitsSelected).map((trait) => {
    return " " + trait[0] + ": " + trait[1];
  })}`;
  var image = `${data.metadata.imageUrl}`;
  if (image == null) {
    image = "";
  }

  const tx = await epnsSdk.sendNotification(
    notifData.address,
    pushNotificationtitle,
    pushNotificationMessage,
    notificationTitle,
    notificationMessage,
    3, //this is the notificationType
    "", // a url for users to be redirected to
    image, // an image url, or an empty string
    null //this can be left as null
  );

  console.log(tx);

  /*
  var tokens;

  if (specificid != "") {
    var specifictoken = await axios.get(
      `https://${reservoirUrl}/tokens/v4?tokens=${contractAddress}%3A${specificid}`
    );
    tokens = specifictoken.data.tokens;
  } else {
    const { data: pulledTokens } = await axios.get(
      `http://localhost:3000/api/tokenPuller?id=${contractAddress}`
    );
    var allTokens = [];
    var rarityTokens;
    allTokens = pulledTokens;
    if (traitsSelected != {}) {
      var traitTokens = [];
      for (const [key, value] of Object.entries(traitsSelected)) {
        traitTokens = [];
        var keyIndex = attdata.findIndex((element) => element.key == key);
        var valueIndex = attdata[keyIndex].values.findIndex(
          (element) => element.value == value
        );
        var traitTokens = attdata[keyIndex].values[valueIndex].tokens;
        traitTokens.map((traittoken) => {
          allTokens.map((id) => {
            if (id.tokenId == traittoken) {
              traitTokens.push(id);
            }
          });
        });
        allTokens = traitTokens;
      }
    }
    if (notifData.raritymin == null || notifData.raritymax == null) {
      rarityTokens = allTokens;
    } else {
      rarityTokens = allTokens.filter((token) => {
        if (
          token.rarityRank >= notifData.raritymin &&
          token.rarityRank <= rarityMax
        ) {
          return token;
        } else if (token.rarityRank == null) {
          return token;
        }
      });
    }
    tokens = rarityTokens;
  }

  const tokenList = tokens.map((token) => {
    return token.tokenId;
  }); */

  const unixTime = Date.now() / 1000;

  const taskDelete = async () => {
    await fetch("http://localhost:3000/api/taskDelete", {
      method: "POST",
      body: id,
    });
  };

  const apiPoll = async (resolve, reject) => {
    const {
      data: { events },
    } = await axios.get(
      `https://${reservoirUrl}/events/tokens/floor-ask/v2?contract=${contractAddress}&startTimestamp=${unixTime}&sortDirection=desc&limit=50`,
      {
        headers: {
          "x-api-key": `${process.env.NEXT_PUBLIC_RESERVOIR_KEY}`,
        },
      }
    );

    const orderIds = events.map((listing) => {
      return listing.token.tokenId;
    });

    var uniqueTokens = [...new Set(orderIds)];
    var fulfilledIds = await client.query(
      `SELECT fulfilled_ids FROM snipe_tracking WHERE id= '${id}'`
    );

    var idArray;
    if (fulfilledIds.rowCount == 0) {
      return reject;
    }

    if (fulfilledIds.rows[0].fulfilled_ids != null) {
      idArray = fulfilledIds.rows[0].fulfilled_ids.split(",");
    } else {
      idArray = [];
    }
    uniqueTokens = uniqueTokens.filter((id) => {
      return idArray.indexOf(id) < 0;
    });

    if (Object.keys(traitsSelected).length != 0) {
      var allTokens = uniqueTokens;
      var allTraitTokens = [];
      for (const [key, value] of Object.entries(traitsSelected)) {
        allTraitTokens = [];
        var keyIndex = attdata.findIndex((element) => element.key == key);
        var valueIndex = attdata[keyIndex].values.findIndex(
          (element) => element.value == value
        );
        var traitTokens = attdata[keyIndex].values[valueIndex].tokens;
        traitTokens.map((traittoken) => {
          allTokens.map((token) => {
            if (token == traittoken) {
              allTraitTokens.push(token);
            }
          });
        });
        allTokens = allTraitTokens;
      }
      uniqueTokens = allTokens;
    }

    if (rarityMin != null && rarityMax != null) {
      var tokenString = "";
      uniqueTokens.forEach((token) => {
        tokenString += `&tokens=${contractAddress}%3A${token}`;
      });
      const { tokens } = await axios.get(
        `https://${reservoirUrl}/tokens/v4?sortBy=floorAskPrice&limit=50&includeTopBid=false${tokenString}`
      );
      uniqueTokens = [];
      tokens.forEach((token) => {
        if (token.rarityRank <= rarityMax && token.rarityRank >= rarityMin) {
          uniqueTokens.push(token.tokenId);
        }
      });
    }
    console.log(uniqueTokens);

    if (uniqueTokens.length != 0) {
      for (var i = 0; i < uniqueTokens.length; i++) {
        if (
          events[orderIds.indexOf(uniqueTokens[i])].floorAsk.price <=
            notifData.price &&
          events[orderIds.indexOf(uniqueTokens[i])].floorAsk.price != null
        ) {
          console.log(`Token #${uniqueTokens[i]} matches query`);
          /* const connection = new ethers.providers.JsonRpcProvider(
            `${alchemyUrl}`
          );

          const wallet = new ethers.Wallet(process.env.SNIPE_PK);
          const signer = wallet.connect(connection);
          try {
            const {
              data: { steps },
            } = await axios.get(
              `https://${reservoirUrl}/execute/buy/v2?token=${contractAddress}%3A${uniqueTokens[i]}&taker=${walletAddress}&onlyQuote=false&referrer=0xFf14BA529d203823F4B6d4a7F23c1568333AE60b&referrerFeeBps=250&source=reservoir.market&partial=false&skipBalanceCheck=true`
            );
            var tx = steps[0].data;
            tx["from"] = `${wallet.address}`;
            try {
              const transaction = await signer.sendTransaction(tx);
              console.log(transaction);
              const success = await transaction.wait(6);
              console.log(success);

              var {
                data: { tokens },
              } = await axios.get(
                `https://${reservoirUrl}/tokens/v4?tokens=${contractAddress}%3A${uniqueTokens[i]}`
              );
              var tokenPkg = tokens[0];
              tokenPkg.address = notifData.address;
              tokenPkg.price =
                events[orderIds.indexOf(uniqueTokens[i])].floorAsk.price;
              await tokenListedNotif.enqueue(tokenPkg);

              var filledIds = await client.query(
                `SELECT fulfilled_ids FROM snipe_tracking WHERE id= '${id}'`
              );
              var newIds;
              if (filledIds.rows[0].fulfilled_ids != null) {
                newIds = filledIds.rows[0].fulfilled_ids.concat(
                  ",",
                  uniqueTokens[i]
                );
              } else {
                newIds = uniqueTokens[i];
              }
              await client.query(
                `UPDATE snipe_tracking SET fulfilled_ids = '${newIds}' WHERE id = '${id}'`
              );
              var quant = await client.query(
                `SELECT quantity FROM snipe_tracking WHERE id= '${id}'`
              );
              var count = quant.rows[0].quantity + 1;
              await client.query(
                `UPDATE snipe_tracking SET quantity = ${count} WHERE id = '${id}'`
              );
              if (count >= parseInt(notifData.quantity)) {
                console.log("adequate snipes fulfilled, terminating process");
                client.end();
                taskDelete();
                return resolve;
              }
            } catch (error) {
              console.log(error);
            }
          } catch (err) {
            console.log("no data");
          } */
        }
      }
    }
    setTimeout(apiPoll, 1000, resolve, reject);
  };

  return new Promise(apiPoll);
});
