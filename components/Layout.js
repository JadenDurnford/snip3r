import styles from "../styles/Layout.module.css";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import axios from "axios";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Layout(props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [results, setResults] = useState([]);

  const getResults = async () => {
    if (!name) {
      setResults([]);
    } else {
      const { data } = await axios.get(`/api/search?name=${name}`);
      setResults([...data]);
    }
  };

  useEffect(() => {
    getResults();
  }, [name]);

  return (
    <div>
      <div className={styles.header}>
        <a href="/">
          <div>
            <img src="/icon.svg" className={styles.icon} />
          </div>
        </a>
        <div>
          <input
            type="text"
            placeholder="Search..."
            className={styles.searchbar}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {results.length > 0 && name !== "" && (
            <div className={styles.search_results}>
              {results.map((result) => {
                return (
                  <button
                    onClick={() => {
                      setName("");
                      router.push(`/collection/${result.collectionId}`);
                    }}
                  >
                    <img src={result.image} />
                    <span>{result.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <ConnectButton />
      </div>
      <div>{props.children}</div>
    </div>
  );
}
