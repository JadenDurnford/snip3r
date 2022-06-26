import styles from "../styles/Predict.module.css";
import Layout from "../components/Layout";
import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";

export default function Predict() {
    const [data, setData] = useState(null);

    const collect = async () => {
        // FIXME: change this url to eddy's endpoint
        const { data } = await axios.get("/api/prediction");
        setData(data);
    };

    useEffect(() => {
        const refresh = setInterval(() => collect(), 5000);

        return () => {
            clearInterval(refresh);
        }
    }, []);

  return (
    <div className={styles.predict}>
        <h3>Predictions</h3>
        <p>Real-time whale tracking of NFT purchases</p>

        <div className={styles.predict__table}>
            {data ? (
                <ul className={styles.predict__table_list}>
                    {data.map((item, i) => {
                        return (
                            <li key={i} className={styles.predict__table_item}>
                                <Link href={`/collection/${item.contract}`}>
                                    <a>
                                        <img src={item.details.imageUrl} />
                                        <span>{item.details.name}</span>
                                        <h4>Rank: {i + 1}</h4>
                                    </a>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            ) : (
                <span>Loading data (takes a few seconds)...</span>
            )} 
        </div>
    </div>
  )
}