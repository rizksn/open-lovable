export default function Features() {
  return (
    <section id="features" className="py-16 bg-white">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900">Features</h2>
        <p className="mt-4 text-gray-700">Discover the amazing features our app has to offer.</p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-gray-100 p-6 rounded-lg shadow-lg">
            <h3 className="font-bold text-lg">Feature One</h3>
            <p className="mt-2 text-gray-600">Description of feature one that highlights its benefits.</p>
          </div>
          <div className="bg-gray-100 p-6 rounded-lg shadow-lg">
            <h3 className="font-bold text-lg">Feature Two</h3>
            <p className="mt-2 text-gray-600">Description of feature two that highlights its benefits.</p>
          </div>
          <div className="bg-gray-100 p-6 rounded-lg shadow-lg">
            <h3 className="font-bold text-lg">Feature Three</h3>
            <p className="mt-2 text-gray-600">Description of feature three that highlights its benefits.</p>
          </div>
        </div>
      </div>
    </section>
  );
}