export default function Features() {
  return (
    <section className="py-12 bg-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <h3 className="text-3xl font-bold text-gray-900 text-center mb-8">Our Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <h4 className="text-xl font-semibold">World-Class Faculty</h4>
            <p className="text-gray-700">Learn from industry leaders and experienced educators.</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <h4 className="text-xl font-semibold">Innovative Research</h4>
            <p className="text-gray-700">Engage in groundbreaking research and development.</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <h4 className="text-xl font-semibold">Vibrant Campus Life</h4>
            <p className="text-gray-700">Experience a lively community with various activities.</p>
          </div>
        </div>
      </div>
    </section>
  );
}