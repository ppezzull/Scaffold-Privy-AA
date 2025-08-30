export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="h-8 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-5 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-20 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-20 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    </div>
  );
}
