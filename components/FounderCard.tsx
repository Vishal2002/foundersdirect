import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Twitter, Linkedin, Mail, ExternalLink, Building2 } from 'lucide-react';

interface Founder {
  id: string;
  name: string;
  company: string;
  batch: string;
  role?: string;
  twitter_handle?: string;
  linkedin_url?: string;
  email?: string;
  company_url?: string;
  company_description?: string;
  industry?: string;
  location?: string;
  confidence_score?: number;
}

export default function FounderCard({ founder }: { founder: Founder }) {
  const getBestContactMethod = () => {
    if (founder.twitter_handle) return "Twitter DM (most responsive)";
    if (founder.linkedin_url) return "LinkedIn message with context";
    if (founder.email) return "Email (keep it concise)";
    return "Check their company website";
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-orange-500">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold">{founder.name}</h3>
          <p className="text-gray-600 flex items-center gap-2 mt-1">
            <Building2 className="h-4 w-4" />
            {founder.role || 'Founder'} at {founder.company}
          </p>
        </div>
        
        <Badge className="bg-orange-100 text-orange-900 hover:bg-orange-200">
          {founder.batch}
        </Badge>
      </div>

      {founder.company_description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {founder.company_description}
        </p>
      )}

      {(founder.industry || founder.location) && (
        <div className="flex gap-2 mb-4 text-sm">
          {founder.industry && (
            <Badge variant="outline">{founder.industry.split(',')[0]}</Badge>
          )}
          {founder.location && (
            <Badge variant="outline">📍 {founder.location}</Badge>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {founder.twitter_handle && (
          <Button variant="outline" size="sm" asChild>
            <a 
              href={`https://twitter.com/${founder.twitter_handle}`} 
              target="_blank"
              rel="noopener noreferrer"
            >
              <Twitter className="mr-2 h-4 w-4" />
              @{founder.twitter_handle}
            </a>
          </Button>
        )}
        
        {founder.linkedin_url && (
          <Button variant="outline" size="sm" asChild>
            <a 
              href={founder.linkedin_url} 
              target="_blank"
              rel="noopener noreferrer"
            >
              <Linkedin className="mr-2 h-4 w-4" />
              LinkedIn
            </a>
          </Button>
        )}
        
        {founder.email && (
          <Button variant="outline" size="sm" asChild>
            <a href={`mailto:${founder.email}`}>
              <Mail className="mr-2 h-4 w-4" />
              Email
            </a>
          </Button>
        )}

        {founder.company_url && (
          <Button variant="outline" size="sm" asChild>
            <a 
              href={founder.company_url} 
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Company
            </a>
          </Button>
        )}
      </div>

      <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-100">
        <p className="text-sm font-medium text-orange-900">
          💡 Best way to reach: {getBestContactMethod()}
        </p>
      </div>
    </Card>
  );
}