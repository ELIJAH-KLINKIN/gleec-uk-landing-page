import Nav from "./components/Nav.jsx";
import Hero from "./components/Hero.jsx";
import Highlights from "./components/Highlights.jsx";
import Explorer from "./components/Explorer.jsx";
import Payments from "./components/Payments.jsx";
import Cards from "./components/Cards.jsx";
import Segments from "./components/Segments.jsx";
import Plans from "./components/Plans.jsx";
import Controls from "./components/Controls.jsx";
import Waitlist from "./components/Waitlist.jsx";
import Faq from "./components/Faq.jsx";
import TalkToHuman from "./components/TalkToHuman.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to Content
      </a>
      <Nav />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Highlights />
        <Explorer />
        <Payments />
        <Cards />
        <Segments />
        <Plans />
        <Controls />
        <Waitlist />
        <Faq />
        <TalkToHuman />
      </main>
      <Footer />
    </>
  );
}
