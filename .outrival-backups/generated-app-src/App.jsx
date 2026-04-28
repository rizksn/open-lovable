import Header from "./components/Header";
import Hero from "./components/Hero";
import Features from "./components/Features";
import Footer from "./components/Footer";

export default function App() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <Hero />
      <Features />
      <Footer />
    </main>
  );
}