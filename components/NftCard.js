import styles from "../styles/NftCard.module.css";
import Image from "next/image";

export default function NftCard(token) {
  return (
    <div id={token.tokenId} className={styles.token}>
      <input type="hidden" value={token.rarityRank} />
      <Image src={token.image} width="200px" height="200px" />
      <div className={styles.tokenInfo}>
        <span>{"#" + token.tokenId}</span>
        {token.floorAskPrice != null && (
          <span>{"Ξ" + token.floorAskPrice}</span>
        )}
      </div>
    </div>
  );
}
