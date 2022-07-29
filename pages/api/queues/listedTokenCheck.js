import { Queue } from "quirrel/next";
import axios from "axios";
import tokenListedNotif from "./tokenListed";
import { Client } from "pg";
import EpnsSDK from "@epnsproject/backend-sdk-staging";

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
  const attdata = JSON.parse(notifData.attdata);
  const traitsSelected = JSON.parse(notifData.traits);
  const specificid = notifData.idvalue;
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
  const image = `${data.metadata.imageUrl}`;

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

  var tokens;

  if (specificid != "") {
    var specifictoken = await axios.get(
      `https://api.reservoir.tools/tokens/v4?tokens=${contractAddress}%3A${specificid}`
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
  });

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
      `https://api.reservoir.tools/events/tokens/floor-ask/v2?contract=${contractAddress}&startTimestamp=${unixTime}&sortDirection=desc&limit=50`,
      {
        headers: {
          "x-api-key": "30e494ac-228f-48d7-8f5a-9202a2e7fc26",
        },
      }
    );

    var orderIds = events.map((listing) => {
      return listing.token.tokenId;
    });

    const matchingTokens = orderIds.filter((element) =>
      tokenList.includes(element)
    );

    var uniqueTokens = [...new Set(matchingTokens)];
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

    if (uniqueTokens.length != 0) {
      for (var i = 0; i < uniqueTokens.length; i++) {
        if (
          events[orderIds.indexOf(uniqueTokens[i])].floorAsk.price <=
            notifData.price &&
          events[orderIds.indexOf(uniqueTokens[i])].floorAsk.price != null
        ) {
          var {
            data: { tokens },
          } = await axios.get(
            `https://api.reservoir.tools/tokens/v4?tokens=${contractAddress}%3A${uniqueTokens[i]}`
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
        }
      }
    }

    setTimeout(apiPoll, 5000, resolve, reject);
  };

  return new Promise(apiPoll);
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};
