import { Helmet } from "react-helmet-async";

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>404 - Page Not Found | ck369 Live</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div style={{ padding: "80px", textAlign: "center" }}>
        <h1>404</h1>
        <p>Sorry, this page does not exist.</p>
      </div>
    </>
  );
}
