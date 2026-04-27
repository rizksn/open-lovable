export default function Header() {
  return (
    <header className="bg-gray-800 p-6 shadow-md">
      <h1 className="text-2xl font-bold text-white">My Awesome App</h1>
      <nav className="mt-4">
        <a href="#features" className="text-gray-300 hover:text-white mx-4">Features</a>
        <a href="#footer" className="text-gray-300 hover:text-white mx-4">Contact</a>
      </nav>
    </header>
  );
}