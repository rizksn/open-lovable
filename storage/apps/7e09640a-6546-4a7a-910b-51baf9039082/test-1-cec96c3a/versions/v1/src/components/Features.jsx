export default function Features() {
  return (
    <section className="bg-gray-800 p-10">
      <h2 className="text-3xl font-bold text-white">Features</h2>
      <ul className="mt-4 space-y-4">
        <li className="bg-gray-700 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-xl text-white">Feature One</h3>
          <p className="text-gray-300">Description of feature one.</p>
        </li>
        <li className="bg-gray-700 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-xl text-white">Feature Two</h3>
          <p className="text-gray-300">Description of feature two.</p>
        </li>
        <li className="bg-gray-700 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-xl text-white">Feature Three</h3>
          <p className="text-gray-300">Description of feature three.</p>
        </li>
      </ul>
    </section>
  );
}