export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold">ProBot</h1>
        <p className="mt-2 text-sm text-gray-600">Stage 1 scaffold</p>
        <a
          href="https://docs.probot.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Docs
        </a>
      </div>
    </main>
  );
}
