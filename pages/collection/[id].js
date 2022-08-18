import axios from "axios";
import Layout from "../../components/Layout";
import NftCard from "../../components/NftCard";
import styles from "../../styles/Id.module.css";
import { useState, useEffect } from "react";
import { useAccount, useNetwork, useEnsName } from "wagmi";
import { ethers } from "ethers";
import InfiniteScroll from "react-infinite-scroll-component";
import Router from "next/router";

async function collectCollection(contractAddress, baseUrl) {
  const {
    data: { collection },
  } = await axios.get(
    `https://${baseUrl}/collection/v3?id=${contractAddress}&includeTopBid=false`,
    { headers: { "x-api-key": `${process.env.NEXT_PUBLIC_RESERVOIR_KEY}` } }
  );
  if (!collection) throw new Error("Could not collect collection data");
  return collection;
}

async function collectCollectionAttributes(contractAddress, baseUrl) {
  const {
    data: { attributes },
  } = await axios.get(
    `https://${baseUrl}/collections/${contractAddress}/attributes/static/v1`,
    { headers: { "x-api-key": `${process.env.NEXT_PUBLIC_RESERVOIR_KEY}` } }
  );
  if (!attributes) throw new Error("Could not collect attribute data");
  return attributes;
}

async function collectCollectionTokens(contractAddress, baseUrl) {
  const { data } = await axios.get(
    `https://${baseUrl}/tokens/v4?collection=${contractAddress}&sortBy=tokenId&limit=50`,
    { headers: { "x-api-key": `${process.env.NEXT_PUBLIC_RESERVOIR_KEY}` } }
  );

  if (!data) throw new Error("Could not collect first 50 tokens");

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

  return data;
}

async function collectListedTokens(contractAddress, baseUrl) {
  var { data } = await axios.get(
    `https://${baseUrl}/tokens/bootstrap/v1?collection=${contractAddress}&limit=500`,
    { headers: { "x-api-key": `${process.env.NEXT_PUBLIC_RESERVOIR_KEY}` } }
  );
  if (!data) throw new Error("Could not collect listed tokens");
  while (data.continuation != null) {
    var data2 = await axios.get(
      `https://${baseUrl}/tokens/bootstrap/v1?collection=${contractAddress}&continuation=${encodeURI(
        data.continuation
      )}`,
      { headers: { "x-api-key": `${process.env.NEXT_PUBLIC_RESERVOIR_KEY}` } }
    );
    data.tokens.push(...data2.data.tokens);
    data.continuation = data2.data.continuation;
  }

  return data.tokens;
}

async function taskDelete(walletAddress, contractAddress) {
  const id = `${walletAddress}` + ":" + `${contractAddress}`;
  await fetch("/api/taskDelete", {
    method: "POST",
    body: id,
  });
}

export default function Collection({
  id,
  data,
  attdata,
  tokendata,
  listedtokens,
  baseUrl,
}) {
  const [rarityBox, setRarityBox] = useState(false);
  const [rarityMin, setRarityMin] = useState(1);
  const [rarityMax, setRarityMax] = useState(data.tokenCount);
  const [traitBox, setTraitBox] = useState(false);
  const [traitType, setTraitType] = useState("");
  const [traitValues, setTraitValues] = useState([]);
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
  const [hasTraits, setHasTraits] = useState(false);
  const [continuation, setContinuation] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const { chain } = useNetwork();
  const [chainChanged, setChainChanged] = useState(false);
  const formValidation = async (
    contractAddress,
    data,
    attdata,
    event,
    traitsSelected,
    address,
    raritymin,
    raritymax,
    idvalue
  ) => {
    event.preventDefault();
    var specificid;
    var rarityMin;
    var rarityMax;
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
    /*
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const gasPriceWei = await signer.getGasPrice();
    const gasPriceEth = ethers.utils.formatEther(gasPriceWei * 200000);

    const amount =
      parseFloat(event.target.quantity.value) *
      (parseFloat(event.target.maxPrice.value) * 1.05 +
        parseFloat(gasPriceEth));
    const bal = await signer.getBalance();
    if (ethers.utils.formatEther(bal) < amount) {
      alert("Balance is too low to complete snipe");
      return false;
    }
    const txReq = {
      from: walletAddress,
      to: "0x2D0AC7b46Df8ea11F6C2B8554A86197E02254C2a",
      value: ethers.utils.parseUnits(`${amount}`),
    };
    try {
      const transaction = await signer.sendTransaction(txReq);
      const success = await transaction.wait(2);
      console.log(success);
    } catch (err) {
      alert(err);
      return false;
    } */

    const snipeData = {
      price: `${event.target.maxPrice.value}`,
      quantity: `${event.target.quantity.value}`,
      contract: `${contractAddress}`,
      data: JSON.stringify(data),
      traits: JSON.stringify(traitsSelected),
      address: `${address}`,
      raritymin: `${rarityMin}`,
      raritymax: `${rarityMax}`,
      idvalue: `${specificid}`,
      chain: `${chain.name}`,
    };
    const JSONData = JSON.stringify(snipeData);
    await fetch("/api/snipeInit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSONData,
    });
  };

  useEffect(() => {
    if (chainChanged) {
      Router.push("/");
    }
    setChainChanged(true);
  }, [chain]);

  useEffect(() => {
    /*
    async function pgPost() {
      await fetch(`/api/pgTableCreate?id=${id}`, {
        method: "POST",
      });
      await fetch(`/api/pgTokenAdd?id=${id}`, {
        method: "POST",
        body: JSON.stringify(tokendata.tokens),
      });
    }
    pgPost(); */
    setContinuation(tokendata.continuation ?? "");
    if (attdata.length == 0) {
      document.getElementById("rarityCheckbox").disabled = true;
      document.getElementById("traitCheckbox").disabled = true;
    } else {
      setTraitType(data.attributes[0].key);
      setTraitValues(
        attdata[
          attdata.findIndex((element) => element.key == data.attributes[0].key)
        ].values.map((result) => result.value)
      );
      setHasTraits(true);
    }
    var pulledTokens = tokendata.tokens;
    var listed = [];
    listedtokens.map((token) => {
      delete Object.assign(token, { ["floorAskPrice"]: token["price"] })[
        "price"
      ];
      delete token["contract"];
      delete token["orderId"];
      delete token["maker"];
      delete token["validFrom"];
      delete token["validUntil"];
      delete token["source"];
      listed.push(token);
    });
    setListedTokens(listed);
    var nonSelectedItems = pulledTokens.filter((obj) =>
      listed.every((s) => s.tokenId !== obj.tokenId)
    );
    var shown = listed.push(...nonSelectedItems);
    setTokens(nonSelectedItems);
    setShownTokens(shown);
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

  const getMoreTokens = async () => {
    const { data } = await axios.get(
      `/api/tokenPull?id=${id}&continuation=${continuation}`
    );
    if (!data) throw new Error("Could not collect more tokens");

    if (!data.continuation) {
      setHasMore(false);
      setContinuation("");
    } else {
      setContinuation(data.continuation);
    }
    function addUnique(array1, array2) {
      return array1.filter((object1) => {
        return !array2.some((object2) => {
          return object1.tokenId === object2.tokenId;
        });
      });
    }
    setTokens((token) => [...token, ...addUnique(data.tokens, shownTokens)]);
    setShownTokens((token) => [
      ...token,
      ...addUnique(data.tokens, shownTokens),
    ]);
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
        const getSingleToken = async () => {
          const { data } = await axios.get(
            `https://${baseUrl}/tokens/v4?tokens=${id}%3A${idValue}`
          );
          setShownTokens(data.tokens);
        };
        getSingleToken();
      } else {
        setShownTokens([]);
      }
    } else if (!idBox && hasTraits) {
      document.getElementById("rarityCheckbox").disabled = false;
      document.getElementById("traitCheckbox").disabled = false;
      document.getElementById("quantity").value = null;
      document.getElementById("quantity").disabled = false;
      setIdValue("");
      setFloorPrice("N/A");
      setNumbMatching("N/A");
      setNumbListed("N/A");
      setShownTokens(listedTokens);
    } else {
      document.getElementById("quantity").value = null;
      document.getElementById("quantity").disabled = false;
      setIdValue("");
      setFloorPrice("N/A");
      setNumbMatching("N/A");
      setNumbListed("N/A");
      setShownTokens([...listedTokens, ...tokens]);
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
      const listedCount = shownTokens.reduce(
        (acc, cur) => (cur.floorAskPrice != null ? ++acc : acc),
        0
      );
      setFloorPrice(shownTokens[0].floorAskPrice);
      setNumbMatching(shownTokens.length);
      setNumbListed(listedCount);
    } else if (!idBox && !traitBox && !rarityBox) {
      setShownTokens([...listedTokens, ...tokens]);
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
  /*
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
  }, [rarityBox]);*/
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
          formValidation(
            id,
            data,
            attdata,
            event,
            traitsSelected,
            walletAddress,
            rarityMin,
            rarityMax,
            idValue
          );
        }}
      >
        <div>
          <p>Max Price</p>{" "}
          <input type="number" placeholder="ETH" step=".0001" id="maxPrice" />
        </div>
        <div className={styles.raritydisabled}>
          {!hasTraits && (
            <span className={styles.raritydisabledtext}>
              Rarity disabled for this query
            </span>
          )}
          <input
            type="checkbox"
            id="rarityCheckbox"
            className={styles.rarityCheckbox}
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
        <div className={styles.traitsdisabled}>
          {!hasTraits && (
            <span className={styles.traitsdisabledtext}>
              Traits disabled for this query
            </span>
          )}
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
      <InfiniteScroll
        id="showTokens"
        className={styles.showTokens}
        dataLength={shownTokens.length}
        next={getMoreTokens}
        hasMore={hasMore}
        scrollThreshold={0.5}
      >
        {shownTokens.length != 0 &&
          shownTokens.map((token) => {
            return NftCard(token);
          })}
      </InfiniteScroll>
    </Layout>
  );
}

export async function getServerSideProps(context) {
  const { id } = context.query;
  const chain = context.query.chain;
  if (!id) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  var baseUrl;
  if (chain == "Ethereum") {
    baseUrl = process.env.API_BASE_URL;
  } else if (chain == "Rinkeby") {
    baseUrl = process.env.API_TEST_URL;
  }

  return {
    props: {
      id: id,
      data: await collectCollection(id, baseUrl),
      attdata: await collectCollectionAttributes(id, baseUrl),
      tokendata: await collectCollectionTokens(id, baseUrl),
      listedtokens: await collectListedTokens(id, baseUrl),
      baseUrl: baseUrl,
    },
  };
}
