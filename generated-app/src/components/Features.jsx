function Features() {
  return (
    <section id="features" className="py-20 bg-gray-100">
      <div className="container mx-auto text-center">
        <h3 className="text-3xl font-bold text-gray-900">Features</h3>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h4 className="text-xl font-semibold text-gray-800">Play Against AI</h4>
            <p className="mt-2 text-gray-600">Challenge yourself against our intelligent computer opponent.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h4 className="text-xl font-semibold text-gray-800">Multiplayer Mode</h4>
            <p className="mt-2 text-gray-600">Invite your friends and enjoy a competitive game.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h4 className="text-xl font-semibold text-gray-800">Responsive Design</h4>
            <p className="mt-2 text-gray-600">Play on any device, anywhere!</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Features;