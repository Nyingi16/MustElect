// components/common/Footer.js
export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p>&copy; {new Date().getFullYear()} MUST Student Elections System</p>
        <p className="text-sm text-gray-400 mt-2">
          Meru University of Science & Technology - Student Leadership Elections
        </p>
        <p className="text-xs text-gray-500 mt-4">
          Powered by Blockchain Technology | Secure & Transparent Voting
        </p>
      </div>
    </footer>
  )
}