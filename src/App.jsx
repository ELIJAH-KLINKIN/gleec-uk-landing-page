import Nav from "./components/Nav.jsx";
import HomeHero from "./components/HomeHero.jsx";
import HomeFeatureCarousel from "./components/HomeFeatureCarousel.jsx";
import HomePartners from "./components/HomePartners.jsx";
import HomeAccounts from "./components/HomeAccounts.jsx";
import HomeGlobalAccounts from "./components/HomeGlobalAccounts.jsx";
import HomeCurrencies from "./components/HomeCurrencies.jsx";
import HomeCards from "./components/HomeCards.jsx";
import HomeSegments from "./components/HomeSegments.jsx";
import HomePlans from "./components/HomePlans.jsx";
import HomeControls from "./components/HomeControls.jsx";
import Waitlist from "./components/Waitlist.jsx";
import HomeFAQ from "./components/HomeFAQ.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
  return (
    <>
      <a className="gl-skip" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main" tabIndex={-1}>
        <HomeHero />
        <HomeFeatureCarousel />
        <HomePartners />
        <HomeAccounts />
        <HomeGlobalAccounts />
        <HomeCurrencies />
        <HomeCards />
        <HomeSegments />
        <HomePlans />
        <HomeControls />
        <Waitlist />
        <HomeFAQ />
      </main>
      <Footer />
    </>
  );
}
