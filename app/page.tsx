'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FounderCard from '@/components/FounderCard';

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [total, setTotal] = useState(0);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!query.trim()) return;
    
    setLoading(true);
    setSearched(true);
    
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.founders || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            FounderDirect
          </h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold mb-4">
              Connect with YC Founders
            </h2>
            <p className="text-xl text-gray-600">
              Instant access to contact info of Y Combinator founders
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search by name, company, or batch (e.g., 'Airbnb', 'Summer 2007', 'Brian Chesky')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="text-lg h-14"
              />
              <Button 
                type="submit" 
                size="lg" 
                className="h-14 px-8"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Results */}
          {loading && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-orange-600" />
              <p className="mt-4 text-gray-600">Searching founders...</p>
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">No founders found for "{query}"</p>
              <p className="mt-2 text-sm text-gray-500">Try searching by company name, founder name, or YC batch</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div className="mb-4 text-gray-600">
                Found {total} founder{total !== 1 ? 's' : ''}
              </div>
              <div className="grid gap-4">
                {results.map((founder) => (
                  <FounderCard key={founder.id} founder={founder} />
                ))}
              </div>
            </>
          )}

          {/* Example Searches */}
          {!searched && (
            <div className="mt-12">
              <p className="text-sm text-gray-500 mb-3">Try searching for:</p>
              <div className="flex flex-wrap gap-2">
                {['Airbnb', 'Instacart', 'Summer 2020', 'Dropbox', 'Apoorva Mehta'].map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery(example);
                      setTimeout(() => handleSearch(), 100);
                    }}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}