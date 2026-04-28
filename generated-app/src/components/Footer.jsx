export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-4">
      <div className="max-w-7xl mx-auto text-center">
        <p>&copy; {new Date().getFullYear()} The University of Michigan. All rights reserved.</p>
      </div>
    </footer>
  );
}