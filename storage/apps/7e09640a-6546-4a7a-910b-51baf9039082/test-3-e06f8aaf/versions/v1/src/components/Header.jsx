export default function Header() {
  return (
    <header className="bg-white shadow-md">
      <nav className="max-w-6xl mx-auto p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">My App</h1>
        <ul className="flex space-x-4">
          <li><a href="#features" className="text-gray-700 hover:text-blue-500 transition">Features</a></li>
          <li><a href="#footer" className="text-gray-700 hover:text-blue-500 transition">Contact</a></li>
        </ul>
      </nav>
    </header>
  );
}