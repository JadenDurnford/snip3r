import styles from "../styles/Layout.module.css";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import axios from "axios";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useNetwork } from "wagmi";
/*import {
  api,
  utils,
  NotificationItem,
} from "@epnsproject/frontend-sdk-staging";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Modal from "react-bootstrap/Modal";
import Row from "react-bootstrap/Row"; */

export default function Layout(props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);
  const { chain } = useNetwork();
  const walletAddress = useAccount().address;

  /*
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const [notifs, setNotifs] = useState([]);
  useEffect(() => {
    if (walletAddress) {
      const fetchNotifs = async () => {
        const pageNumber = 1;
        const itemsPerPage = 20;
        const fetchedNotifications = await api.fetchNotifications(
          walletAddress,
          itemsPerPage,
          pageNumber
        );
        const parsedResponse = utils.parseApiResponse(
          fetchedNotifications.results
        );
        setNotifs(parsedResponse);
      };
      fetchNotifs();
    }
  }, [show]);
  */
  useEffect(() => {
    if (!chain) {
      document.getElementById("searchbar").disabled = true;
    } else if (chain) {
      document.getElementById("searchbar").disabled = false;
    }
  }, [chain]);

  const getResults = async () => {
    if (!name) {
      setResults([]);
    } else {
      const { data } = await axios.get(
        `/api/search?name=${name}&chain=${chain.name}`
      );
      setResults([...data]);
    }
  };

  useEffect(() => {
    getResults();
  }, [name]);

  return (
    <div>
      <div className={styles.header}>
        <a href="/" className={styles.icon}>
          <div className={styles.linkbox}>
            <img src="/smallicon.svg" />
            <div className={styles.icontext}>snip3r</div>
          </div>
        </a>
        <div className={styles.searchbarbox}>
          <input
            type="text"
            placeholder="Search..."
            className={styles.searchbar}
            value={name}
            onChange={(e) => setName(e.target.value)}
            id="searchbar"
          />
          {results.length > 0 && name !== "" && (
            <div className={styles.search_results}>
              {results.map((result) => {
                return (
                  <button
                    onClick={() => {
                      setName("");
                      router.push({
                        pathname: `/collection/${result.collectionId}`,
                        query: { chain: chain.name },
                      }),
                        `/collection/${result.collectionId}`;
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
        <ConnectButton
          chainStatus={{
            smallScreen: "none",
            largeScreen: "icon",
          }}
          accountStatus={{
            smallScreen: "avatar",
            largeScreen: "full",
          }}
        />
      </div>
      <div>{props.children}</div>
    </div>
  );
}
