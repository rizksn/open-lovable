import React from 'react';
import Header from './components/Header';
import Calculator from './components/Calculator';
import Footer from './components/Footer';

export default function App() {
  return (
    <main className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <Calculator />
      <Footer />
    </main>
  );
}