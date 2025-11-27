import { Input } from '@/components/Input';

export default async function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Wiki Generator</h1>
          <p className="text-gray-600">
            Generate comprehensive documentation for any GitHub repository
          </p>
        </div>
        <Input />
      </div>
    </div>
  );
}
