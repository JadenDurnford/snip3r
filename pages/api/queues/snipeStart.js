import { Queue } from "quirrel/next";
import EpnsSDK from "@epnsproject/backend-sdk-staging";

export default Queue("api/queues/snipeStart", async (notifData) => {
  const epnsSdk = new EpnsSDK(process.env.CHANNEL_PK);

  const traits = JSON.parse(`${notifData.traits}`);
  const data = JSON.parse(`${notifData.data}`);
  const pushNotificationtitle = `Your snipe on ${data.name} was created`;
  const pushNotificationMessage = `Your snipe with parameters: 
  Max Price= ${notifData.price}
  Quantity= ${notifData.quantity}
  Traits Selected=${Object.entries(traits).map((trait) => {
    return " " + trait[0] + ": " + trait[1];
  })}`;
  const notificationTitle = `Your snipe on ${data.name} was created`;
  const notificationMessage = `Your snipe with parameters: 
  Max Price= ${notifData.price}
  Quantity= ${notifData.quantity}
  Traits Selected=${Object.entries(traits).map((trait) => {
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

  return;
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};
