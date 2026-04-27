export default function Hero() {
  return (
    <section className="flex flex-col items-center justify-center p-8 bg-blue-500 text-white">
      <h2 className="text-4xl font-bold mb-4">Welcome to the University of Michigan</h2>
      <p className="text-lg mb-6">Empowering students to reach their full potential through education and innovation.</p>
      <button className="px-6 py-2 bg-white text-blue-500 font-semibold rounded-lg shadow-md hover:bg-gray-200 transition-all duration-200">
        Learn More
      </button>
    </section>
  );
}