type PublishedAppRunnerPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PublishedAppRunnerPage({
  params,
}: PublishedAppRunnerPageProps) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Published app runner</h1>
        <p className="mt-2 text-sm text-slate-500">Slug: {slug}</p>
      </div>
    </main>
  );
}
