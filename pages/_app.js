import '../styles/globals.css'
import NextNProgress from "nextjs-progressbar";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <NextNProgress
        color="#7ED957"
        startPosition={0.3}
        showOnShallow={true}
        options={{ showSpinner: false }}
      />
      <Component {...pageProps} />
    </>
  )
}

export default MyApp
