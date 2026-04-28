export default function Features() {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-10">Our Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Innovative Programs</h3>
            <p>Explore a wide range of innovative programs that foster creativity and critical thinking.</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Experienced Faculty</h3>
            <p>Learn from distinguished faculty members who are leaders in their fields.</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">Vibrant Campus Life</h3>
            <p>Join a diverse community with countless opportunities for engagement and exploration.</p>
          </div>
        </div>
      </div>
    </section>
  );
}