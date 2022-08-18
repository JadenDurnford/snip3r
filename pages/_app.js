import "../styles/globals.css";
import NextNProgress from "nextjs-progressbar";
import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultWallets,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { chain, configureChains, createClient, WagmiConfig } from "wagmi";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import Head from "next/head";

const { chains, provider } = configureChains(
  [chain.mainnet, chain.rinkeby],
  [
    alchemyProvider({ alchemyId: process.env.ALCHEMY_MAINNET }),
    publicProvider(),
  ]
);
const { connectors } = getDefaultWallets({
  appName: "My RainbowKit App",
  chains,
});
const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <WagmiConfig client={wagmiClient}>
        <RainbowKitProvider
          chains={chains}
          theme={darkTheme({ overlayBlur: "small" })}
        >
          <NextNProgress
            color="#7ED957"
            startPosition={0.3}
            showOnShallow={true}
            options={{ showSpinner: false }}
          />
          <Component {...pageProps} />
        </RainbowKitProvider>
      </WagmiConfig>
    </>
  );
}

export default MyApp;
