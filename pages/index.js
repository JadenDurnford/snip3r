import styles from "../styles/Home.module.css";
import Layout from "../components/Layout";
import Predict from "./predict";

export default function Home() {
  return (
    <Layout>
      <Predict></Predict>
    </Layout>
  )
}