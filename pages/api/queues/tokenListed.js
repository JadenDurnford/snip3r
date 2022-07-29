import { Queue } from "quirrel/next";
import EpnsSDK from "@epnsproject/backend-sdk-staging";

export default Queue("api/queues/tokenListed", async (tokenData) => {
  const epnsSdk = new EpnsSDK(process.env.CHANNEL_PK);

  const pushNotificationtitle = `${tokenData.collection.name} listing`;
  const pushNotificationMessage = `Token #${tokenData.tokenId} was just listed for ${tokenData.price} ETH`;
  const notificationTitle = `${tokenData.collection.name} listing`;
  const notificationMessage = `Token #${tokenData.tokenId} was just listed for ${tokenData.price} ETH`;
  const image = `${tokenData.image}`;

  const tx = await epnsSdk.sendNotification(
    tokenData.address,
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
