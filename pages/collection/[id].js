import axios from "axios";
import Layout from "../../components/Layout";
import styles from "../../styles/Id.module.css";
import Script from "next/script";

async function collectCollection(contractAddress) {
    const { data: { collection } } = await axios.get(
        `https://api.reservoir.tools/collection/v2?id=${contractAddress}`
    );
    if (!collection) throw new Error("Could not collect collection data");
    return collection;
}

async function collectCollectionAtts(contractAddress) {
    const { data: {attributes}} = await axios.get(
        `https://api.reservoir.tools/collections/${contractAddress}/attributes/all/v2`
    )
    if (!attributes) throw new Error("Could not collect attribute data");
    return attributes;
}

function traitType(trait, attdata) {
    document.getElementById("traittypes").innerHTML = "";
    attdata.map((result) => {
     if (result.key == trait) {
         for (let i = 0; i < result.attributeCount; i++) {
             var sel = document.getElementById("traittypes");
             var opt = document.createElement("option");

             opt.value = `${result.values[i].value}`;
             opt.text = `${result.values[i].value}`;

             sel.add(opt);
        }
    }
    }) 
}

export default function Collection({ id, data, attdata }) {
    const attributes = attdata;
    console.log(data);

    return (
        <Layout>
            <div className={styles.header}>
                <div className={styles.banner} style={{
                    backgroundImage: `url(${data.metadata.bannerImageUrl})`
                }} />

                <div className={styles.collInfo}>
                    <img src={data.metadata.imageUrl} className={styles.icon}/>
                    <p className={styles.collName}>{data.name}</p>
                </div>
            </div>
            <div className={styles.snipe}>
                <p className={styles.snipeTitle}>Snipe Settings</p>
            </div>
            <div className={styles.snipeParams}>
                <div><p>Max Price</p> <input type="text" placeholder="ETH"/></div>
                <div>
                    <p>Rarity Max</p>
                    <input type="range" min="1" max={data.tokenCount} id="raritymaxslider" onChange={() => {document.getElementById("raritymax").innerText = document.getElementById("raritymaxslider").value}}/>
                    <p id="raritymax">{data.tokenCount}</p>
                    <p>Rarity Min</p>
                    <input type="range" min="1" max={data.tokenCount} id="rarityminslider" onChange={() => {document.getElementById("raritymin").innerText = document.getElementById("rarityminslider").value}}/>
                    <p id="raritymin">1</p>
                </div>
                <div>
                    <p>Traits</p>
                    <select id="trait" onChange={() => {if (document.getElementById("trait").value != null) {traitType(document.getElementById("trait").value, attributes)}}} onLoad={() => {
                                var blankOption = document.createElement("option");

                                blankOption.value = "none";
                                blankOption.text = "Select an Option";
                                blankOption.selected = true;
                                blankOption.disabled = true;
                                blankOption.hidden = true;

                                document.getElementById("trait").add(blankOption);
                            }}>
                        {data.attributes.map((result) => {
                            return (
                                <option value={result.key}>
                                    {result.key}
                                </option>
                            )
                        }
                        )
                        }  
                    </select>
                    <p>Trait Type</p>
                    <select id="traittypes">
                    </select>
                </div>
                <div>
                    <p>Specific ID</p>
                    <input type="text" />
                </div>
                <div>
                    <p>Quantity</p>
                    <input type="text" />
                </div>
                <div><input type="checkbox" id="epns"/><label for="epns">EPNS Notifs</label></div>
            </div>
        </Layout>
        
    
    )
    
}

export async function getServerSideProps(context) {
    const { id } = context.query;

    if (!id) {
        return {
            redirect: {
                destination: "/",
                permanent: false,
            },
        }
    }

    return {
        props: {
            id,
            data: await collectCollection(id),
            attdata: await collectCollectionAtts(id)
        }
    }
}