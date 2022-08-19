import axios from "axios";
import Layout from "../../components/Layout";
import styles from "../../styles/Id.module.css";
import { useState, useEffect } from "react";
import { useAccount, useNetwork } from "wagmi";
import { ethers } from "ethers";
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

async function taskDelete(walletAddress, contractAddress) {
  const id = `${walletAddress}` + ":" + `${contractAddress}`;
  await fetch("/api/taskDelete", {
    method: "POST",
    body: id,
  });
}

export default function Collection({ id, data, attdata }) {
  const [rarityBox, setRarityBox] = useState(false);
  const [rarityMin, setRarityMin] = useState(1);
  const [rarityMax, setRarityMax] = useState(data.tokenCount);
  const [traitBox, setTraitBox] = useState(false);
  const [traitType, setTraitType] = useState("");
  const [traitValues, setTraitValues] = useState([]);
  const [traitsSelected, setTraitsSelected] = useState({});
  const [idBox, setIdBox] = useState(false);
  const [idValue, setIdValue] = useState("");
  const walletAddress = useAccount().address;
  const [hasTraits, setHasTraits] = useState(false);
  const { chain } = useNetwork();
  const [chainChanged, setChainChanged] = useState(false);

  const formValidation = async (
    contractAddress,
    data,
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
    const value = ethers.utils.parseUnits(`${amount}`);
    const txReq = {
      from: walletAddress,
      to: "0xf3341D40200d612E66ab2B2f551b85D171690148",
      value: value,
    };
    try {
      const transaction = await signer.sendTransaction(txReq);
      const success = await transaction.wait(2);
      console.log(success);
    } catch (err) {
      alert(err);
      return false;
    }

    const snipeData = {
      price: `${event.target.maxPrice.value}`,
      quantity: `${event.target.quantity.value}`,
      contract: `${contractAddress}`,
      data: JSON.stringify(data),
      traits: JSON.stringify(traitsSelected),
      address: `${address}`,
      raritymin: rarityMin,
      raritymax: rarityMax,
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
    } else if (hasTraits) {
      document.getElementById("rarityCheckbox").disabled = false;
      document.getElementById("traitCheckbox").disabled = false;
      document.getElementById("quantity").value = null;
      document.getElementById("quantity").disabled = false;
      setIdValue("");
    } else if (!hasTraits) {
      document.getElementById("quantity").value = null;
      document.getElementById("quantity").disabled = false;
      setIdValue("");
    }
  }, [idBox, idValue]);

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
    },
  };
}
