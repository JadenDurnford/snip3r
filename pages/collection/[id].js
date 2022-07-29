import axios from "axios";
import Layout from "../../components/Layout";
import NftCard from "../../components/NftCard";
import styles from "../../styles/Id.module.css";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

async function collectCollection(contractAddress) {
  const {
    data: { collection },
  } = await axios.get(
    `https://api.reservoir.tools/collection/v2?id=${contractAddress}`,
    { headers: { "x-api-key": `${process.env.NEXT_PUBLIC_RESERVOIR_KEY}` } }
  );
  if (!collection) throw new Error("Could not collect collection data");
  return collection;
}

async function collectCollectionAtts(contractAddress) {
  const {
    data: { attributes },
  } = await axios.get(
    `https://api.reservoir.tools/collections/${contractAddress}/attributes/static/v1`,
    { headers: { "x-api-key": `${process.env.NEXT_PUBLIC_RESERVOIR_KEY}` } }
  );
  if (!attributes) throw new Error("Could not collect attribute data");
  return attributes;
}

async function collectCollectionTokens(contractAddress) {
  console.log("started token collection...");
  const t0 = performance.now();

  let form = document.getElementById("snipeForm");
  let elements = form.elements;
  for (let i = 0; i < elements.length; i++) {
    elements[i].disabled = true;
  }

  var { data: tokenList } = await axios.get(
    `http://localhost:8080/https://api.reservoir.tools/tokens/v4?collection=${contractAddress}&sortBy=tokenId&limit=50`,
    { headers: { "x-api-key": `${process.env.NEXT_PUBLIC_RESERVOIR_KEY}` } }
  );
  while (tokenList.continuation != null) {
    var { data: tokenNext } = await axios.get(
      `http://localhost:8080/https://api.reservoir.tools/tokens/v4?collection=${contractAddress}&sortBy=tokenId&limit=50&continuation=${encodeURI(
        tokenList.continuation
      )}`,
      { headers: { "x-api-key": `${process.env.NEXT_PUBLIC_RESERVOIR_KEY}` } }
    );
    tokenList.tokens.push(...tokenNext.tokens);
    tokenList.continuation = tokenNext.continuation;
  }

  for (let i = 0; i < elements.length; i++) {
    elements[i].disabled = false;
  }

  const t1 = performance.now();
  console.log(`Collecting tokens took ${t1 - t0} milliseconds.`);

  if (!tokenList) throw new Error("Could not collect Tokens");
  return tokenList.tokens;
}

async function collectListedTokens(contractAddress) {
  const {
    data: { tokens },
  } = await axios.get(
    `https://api.reservoir.tools/tokens/floor/v1?collection=${contractAddress}`,
    { headers: { "x-api-key": `${process.env.NEXT_PUBLIC_RESERVOIR_KEY}` } }
  );
  if (!tokens) throw new Error("Count not collect listed tokens");
  const tokenArray = Object.entries(tokens);
  tokenArray.sort((a, b) => {
    return a[1] - b[1];
  });
  return tokenArray;
}

const formValidation = async (
  contractAddress,
  data,
  attdata,
  event,
  traitsSelected,
  address,
  raritymin,
  raritymax,
  idvalue,
  tokencount
) => {
  event.preventDefault();
  var specificid;
  var rarityMin;
  var rarityMax;
  if (tokencount <= 0) {
    alert("Query does not match any tokens.");
    return false;
  }
  if (address == undefined) {
    alert("Please connect your wallet");
    return false;
  }
  if (event.target.quantity.value < 1) {
    alert("Quantity must be greater than 0.");
    return false;
  }
  if (event.target.maxPrice.value <= 0) {
    alert("Max Price must be greater than 0.");
    return false;
  }
  if (event.target.idCheckbox.checked) {
    specificid = idvalue;
  } else {
    specificid = "";
  }
  if (event.target.rarityCheckbox.checked) {
    rarityMin = raritymin;
    rarityMax = raritymax;
  } else {
    rarityMin = null;
    rarityMax = null;
  }

  const epnsData = {
    price: `${event.target.maxPrice.value}`,
    quantity: `${event.target.quantity.value}`,
    contract: `${contractAddress}`,
    data: JSON.stringify(data),
    attdata: JSON.stringify(attdata),
    traits: JSON.stringify(traitsSelected),
    address: `${address}`,
    raritymin: `${rarityMin}`,
    raritymax: `${rarityMax}`,
    idvalue: `${specificid}`,
  };
  const epnsJSONData = JSON.stringify(epnsData);
  await fetch("/api/snipeInit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: epnsJSONData,
  });
};

async function taskDelete(address, contract) {
  const id = `${address}` + ":" + `${contract}`;
  await fetch("/api/taskDelete", {
    method: "POST",
    body: id,
  });
}

async function tokenDataCache(id, tokens) {
  console.log("adding tokens to DB");
  const tokenJSON = {
    id: id,
    tokens: tokens,
  };
  await fetch("/api/tokenStorage", {
    method: "POST",
    body: JSON.stringify(tokenJSON),
  });
}

export default function Collection({
  id,
  data,
  attdata,
  tokendata,
  listedtokens,
}) {
  const [rarityBox, setRarityBox] = useState(false);
  const [rarityMin, setRarityMin] = useState(1);
  const [rarityMax, setRarityMax] = useState(data.tokenCount);
  const [traitBox, setTraitBox] = useState(false);
  const [traitType, setTraitType] = useState(data.attributes[0].key);
  const [traitValues, setTraitValues] = useState(
    attdata[
      attdata.findIndex((element) => element.key == traitType)
    ].values.map((result) => result.value)
  );
  const [traitsSelected, setTraitsSelected] = useState({});
  const [idBox, setIdBox] = useState(false);
  const [idValue, setIdValue] = useState("");
  const [tokens, setTokens] = useState([]);
  const [shownTokens, setShownTokens] = useState([]);
  const [floorPrice, setFloorPrice] = useState("");
  const [numbMatching, setNumbMatching] = useState("");
  const [numbListed, setNumbListed] = useState("");
  const [listedTokens, setListedTokens] = useState([]);
  const walletAddress = useAccount().address;

  useEffect(() => {
    if (Object.keys(tokendata).length == 0) {
      console.log("no token data cached");
      getTokens();
    } else {
      var pulledTokens = tokendata;
      var tempTokens = [];
      var baseToken = {};
      listedtokens.map((token) => {
        baseToken = pulledTokens[parseInt(token[0])];
        baseToken.floorAskPrice = token[1];
        tempTokens.push(baseToken);
      });
      setListedTokens(tempTokens);
      setShownTokens(tempTokens);
      setTokens(pulledTokens);
    }
  }, []);

  const removeTrait = (removed) => {
    setTraitsSelected((current) => {
      const copy = { ...current };
      delete copy[removed];
      return copy;
    });
  };
  const addTrait = () => {
    setTraitsSelected((current) => {
      const copy = { ...current };
      copy[traitType] =
        traitValues[document.getElementById("traitValues").selectedIndex];
      return copy;
    });
  };

  const getTokens = async () => {
    setFloorPrice("⏳");
    setNumbMatching("⏳");
    setNumbListed("⏳");
    var pulledTokens = await collectCollectionTokens(id);
    pulledTokens.forEach((object) => {
      delete object["contract"];
      delete object["name"];
      delete object["media"];
      delete object["collection"];
      delete object["source"];
      delete object["topBidValue"];
      delete object["rarity"];
      delete object["owner"];
      object.floorAskPrice = null;
    });
    tokenDataCache(id, JSON.stringify(pulledTokens));
    var tempTokens = [];
    var baseToken = {};
    listedtokens.map((token) => {
      baseToken = pulledTokens[parseInt(token[0])];
      baseToken.floorAskPrice = token[1];
      tempTokens.push(baseToken);
    });
    setListedTokens(tempTokens);
    setShownTokens(tempTokens);
    setTokens(pulledTokens);
  };

  useEffect(() => {
    if (idBox) {
      setRarityBox(false);
      setTraitBox(false);
      document.getElementById("rarityCheckbox").checked = false;
      document.getElementById("traitCheckbox").checked = false;
      document.getElementById("rarityCheckbox").disabled = true;
      document.getElementById("traitCheckbox").disabled = true;
      document.getElementById("quantity").value = 1;
      document.getElementById("quantity").disabled = true;

      if (idValue != "") {
        setShownTokens([
          tokens[tokens.map((object) => object.tokenId).indexOf(idValue)],
        ]);
      } else {
        setShownTokens([]);
      }
    } else if (!idBox) {
      document.getElementById("rarityCheckbox").disabled = false;
      document.getElementById("traitCheckbox").disabled = false;
      document.getElementById("quantity").value = null;
      document.getElementById("quantity").disabled = false;
      setIdValue("");
      setFloorPrice("N/A");
      setNumbMatching("N/A");
      setNumbListed("N/A");
      setShownTokens(listedTokens);
    }
  }, [idBox, idValue]);

  useEffect(() => {
    if (Object.keys(traitsSelected).length != 0) {
      var allTokens = tokens;
      var shownTraitTokens = [];
      for (const [key, value] of Object.entries(traitsSelected)) {
        shownTraitTokens = [];
        var keyIndex = attdata.findIndex((element) => element.key == key);
        var valueIndex = attdata[keyIndex].values.findIndex(
          (element) => element.value == value
        );
        var traitTokens = attdata[keyIndex].values[valueIndex].tokens;
        traitTokens.map((traittoken) => {
          allTokens.map((token) => {
            if (token.tokenId == traittoken) {
              shownTraitTokens.push(token);
            }
          });
        });
        allTokens = shownTraitTokens;
      }

      shownTraitTokens.sort((a, b) => {
        if (a.floorAskPrice == null) {
          return 1;
        }
        if (b.floorAskPrice == null) {
          return -1;
        }
        if (a.floorAskPrice < b.floorAskPrice) {
          return -1;
        }
        if (a.floorAskPrice > b.floorAskPrice) {
          return 1;
        }
        return 0;
      });
      setShownTokens(shownTraitTokens);
    } else if (traitBox == true) {
      setShownTokens(listedTokens);
    }
  }, [traitsSelected]);

  useEffect(() => {
    if (shownTokens.length != 0) {
      console.log(shownTokens);
      const listedCount = shownTokens.reduce(
        (acc, cur) => (cur.floorAskPrice != null ? ++acc : acc),
        0
      );
      setFloorPrice(shownTokens[0].floorAskPrice);
      setNumbMatching(shownTokens.length);
      setNumbListed(listedCount);
    } else if (!idBox && !traitBox && !rarityBox) {
      setShownTokens(listedTokens);
    } else {
      setFloorPrice("N/A");
      setNumbMatching("N/A");
      setNumbListed("N/A");
    }
  }, [shownTokens]);

  useEffect(() => {
    let tempTokens = [];
    let listedCounter = 0;
    shownTokens.map((token) => {
      if (token.rarityRank == null) {
        document.getElementById(token.tokenId).style.display = "block";
        tempTokens.push(token);
        if (token.floorAskPrice == null) {
          return;
        } else {
          listedCounter++;
        }
      } else if (token.rarityRank < rarityMin || token.rarityRank > rarityMax) {
        document.getElementById(token.tokenId).style.display = "none";
      } else {
        document.getElementById(token.tokenId).style.display = "block";
        tempTokens.push(token);
        if (token.floorAskPrice == null) {
          return;
        } else {
          listedCounter++;
        }
      }
    });
    if (tempTokens.length != 0) {
      setFloorPrice(
        tempTokens[0].floorAskPrice == null
          ? "N/A"
          : tempTokens[0].floorAskPrice
      );
      setNumbMatching(tempTokens.length);
      setNumbListed(listedCounter);
    } else {
      setFloorPrice("N/A");
      setNumbMatching("N/A");
      setNumbListed("N/A");
    }
  }, [rarityMax, rarityMin, rarityBox, traitBox]);

  useEffect(() => {
    if (!rarityBox && tokens.length != 0) {
      let nodes = document.getElementById("showTokens");
      for (let i = 0; i < nodes.children.length; i++) {
        nodes.children[i].style.display = "block";
      }
      let listedCounter = 0;
      tokens.map((token) => {
        if (token.floorAskPrice == null) {
          return;
        } else {
          listedCounter++;
        }
      });
      setFloorPrice(tokens[0].floorAskPrice);
      setNumbMatching(tokens.length);
      setNumbListed(listedCounter);
    }
  }, [rarityBox]);

  return (
    <Layout>
      <div className={styles.header}>
        <div
          className={styles.banner}
          style={{
            backgroundImage: `url(${data.metadata.bannerImageUrl})`,
          }}
        />
        <div className={styles.collInfo}>
          <img src={data.metadata.imageUrl} className={styles.icon} />
          <p className={styles.collName}>{data.name}</p>
          <button
            type="button"
            id="abortNotif"
            onClick={() => {
              taskDelete(walletAddress, id);
            }}
          >
            Stop Notifs
          </button>
        </div>
      </div>
      <div className={styles.snipe}>
        <p className={styles.snipeTitle}>Snipe Settings</p>
      </div>
      <form
        id="snipeForm"
        className={styles.snipeParams}
        onSubmit={(event) => {
          var tokencount = shownTokens.length;
          formValidation(
            id,
            data,
            attdata,
            event,
            traitsSelected,
            walletAddress,
            rarityMin,
            rarityMax,
            idValue,
            tokencount
          );
        }}
      >
        <div>
          <p>Max Price</p>{" "}
          <input type="number" placeholder="ETH" step=".0001" id="maxPrice" />
        </div>
        <div>
          <input
            type="checkbox"
            id="rarityCheckbox"
            onChange={(e) => setRarityBox(e.target.checked)}
          />
          <label for="rarityCheckbox">Rarity</label>
          {rarityBox && (
            <div>
              <p>Rarity Min</p>
              <input
                type="range"
                id="rarityMin"
                min="1"
                max={data.tokenCount}
                value={rarityMin}
                onChange={(e) => setRarityMin(e.target.value)}
              />
              <p>{rarityMin}</p>
              <p>Rarity Max</p>
              <input
                type="range"
                id="rarityMax"
                min="1"
                max={data.tokenCount}
                value={rarityMax}
                onChange={(e) => setRarityMax(e.target.value)}
              />
              <p>{rarityMax}</p>
            </div>
          )}
        </div>
        <div>
          <input
            type="checkbox"
            id="traitCheckbox"
            onChange={(e) => {
              setTraitBox(e.target.checked);
              setTraitType(data.attributes[0].key);
              setTraitValues(
                attdata[
                  attdata.findIndex(
                    (element) => element.key == data.attributes[0].key
                  )
                ].values.map((result) => result.value)
              );
              setTraitsSelected({});
            }}
          />
          <label for="traitCheckbox">Trait Selection</label>
          {traitBox && (
            <div>
              <select
                id="traitTypes"
                onChange={(e) => {
                  setTraitType(e.target.options[e.target.selectedIndex].value);
                  setTraitValues(
                    attdata[
                      attdata.findIndex(
                        (element) =>
                          element.key ==
                          e.target.options[e.target.selectedIndex].value
                      )
                    ].values.map((result) => result.value)
                  );
                  document.getElementById("traitValues").selectedIndex = "0";
                }}
              >
                {data.attributes.map((result) => {
                  return <option value={result.key}>{result.key}</option>;
                })}
              </select>
              <label for="traitTypes">Trait Type</label>
              <select id="traitValues">
                {traitValues.map((value) => {
                  return <option value={value}>{value}</option>;
                })}
              </select>
              <label for="traitValues">Trait Value</label>
              <button
                type="button"
                onClick={() => {
                  traitType in traitsSelected == false && addTrait();
                }}
              >
                Add Trait
              </button>
              {Object.keys(traitsSelected).length != 0 && (
                <div>
                  {Object.keys(traitsSelected).map((key) => {
                    return (
                      <div className={key + "-" + traitsSelected[key]}>
                        <span>{key + "-" + traitsSelected[key]}</span>
                        <button
                          type="button"
                          onClick={() => {
                            removeTrait(key);
                          }}
                        >
                          X
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <input
            type="checkbox"
            id="idCheckbox"
            onChange={(e) => {
              setIdBox(e.target.checked);
            }}
          />
          <label for="idCheckbox">Specific ID #</label>
          {idBox && (
            <input
              type="text"
              id="specificid"
              value={idValue}
              onChange={(e) => setIdValue(e.target.value.replace(/\D/, ""))}
            />
          )}
        </div>
        <div>
          <p>Quantity</p>
          <input type="number" id="quantity" />
        </div>
        <div>
          <input type="checkbox" id="epns" />
          <label for="epns">EPNS Notifs</label>
        </div>
        <div>
          <input type="submit" value="Snipe!" id="submit" />
        </div>
      </form>
      <div className={styles.tokenStats}>
        <div>
          <span>Estimated Floor Price: </span>
          <span id="floorPrice">{floorPrice}</span>
        </div>
        <div>
          <span>Number of Matching Tokens: </span>
          <span id="numTokens">{numbMatching}</span>
        </div>
        <div>
          <span>Number of Listed Tokens: </span>
          <span id="numTokensListed">{numbListed}</span>
        </div>
      </div>
      <div id="showTokens" className={styles.showTokens}>
        {shownTokens.length != 0 &&
          shownTokens.map((token) => {
            return NftCard(token);
          })}
      </div>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const { id } = context.query;
  if (!id) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }
  const { data: tokens } = await axios.get(
    `http://localhost:3000/api/tokenPuller?id=${id}`
  );
  return {
    props: {
      id,
      data: await collectCollection(id),
      attdata: await collectCollectionAtts(id),
      tokendata: tokens,
      listedtokens: await collectListedTokens(id),
    },
  };
}
