export default function Features() {
  return (
    <section id="features" className="p-10">
      <h3 className="text-3xl font-bold text-center mb-6">Features</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-xl font-semibold">Feature One</h4>
          <p className="mt-2 text-gray-700">Description of feature one. It is really awesome!</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-xl font-semibold">Feature Two</h4>
          <p className="mt-2 text-gray-700">Description of feature two. You will love it!</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="text-xl font-semibold">Feature Three</h4>
          <p className="mt-2 text-gray-700">Description of feature three. Don't miss out!</p>
        </div>
      </div>
    </section>
  );
}