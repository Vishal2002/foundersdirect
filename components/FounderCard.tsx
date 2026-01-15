import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Twitter, Linkedin, Mail, ExternalLink, Building2, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface Founder {
  id: string;
  name: string;
  company: string;
    bio?: string;
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
  avatar_url?: string;
}

export default function FounderCard({ founder }: { founder: Founder }) {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const getBestContactMethod = () => {
    if (founder.email) return "Email (most direct)";
    if (founder.twitter_handle) return "Twitter DM (most responsive)";
    if (founder.linkedin_url) return "LinkedIn message with context";
    return "Check their company website";
  };

  const getAvatarUrl = () => {
    if (founder.avatar_url) return founder.avatar_url;
    
    // Generate avatar from name using UI Avatars
    const initials = founder.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(founder.name)}&background=ea580c&color=fff&size=128&bold=true`;
  };

  const copyEmail = () => {
    if (founder.email) {
      navigator.clipboard.writeText(founder.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  // Clean up company description
  const cleanDescription = founder.company_description
    ?.replace(/\s+/g, ' ')
    .trim()
    .substring(0, 150);

  return (
    <Card className="p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-orange-500 bg-white">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <img
            src={getAvatarUrl()}
            alt={founder.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-orange-200"
            onError={(e) => {
              // Fallback to UI Avatars if image fails to load
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(founder.name)}&background=ea580c&color=fff&size=128&bold=true`;
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{founder.name}</h3>
              <p className="text-gray-600 flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {founder.role || 'Founder'} at {founder.company}
                </span>
              </p>
            </div>
            
            <Badge className="bg-orange-100 text-orange-900 hover:bg-orange-200 flex-shrink-0">
              {founder.batch}
            </Badge>
          </div>

          {cleanDescription && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {cleanDescription}
              {founder.company_description && founder.company_description.length > 150 && '...'}
            </p>
          )}

{founder.email && (
  <div className="flex gap-1 items-center mb-2">
    <Button variant="default" size="sm" asChild className="bg-orange-600 hover:bg-orange-700">
      <a href={`mailto:${founder.email}`}>
        <Mail className="mr-2 h-4 w-4" />
        {founder.email}
      </a>
    </Button>
    <Button
      variant="outline"
      size="sm"
      onClick={copyEmail}
      className="px-2"
      title="Copy email"
    >
      {copiedEmail ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
    {founder.confidence_score && (
      <Badge 
        variant="outline" 
        className={`text-xs ${
          founder.confidence_score >= 90 ? 'bg-green-50 text-green-700 border-green-200' :
          founder.confidence_score >= 70 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
          'bg-orange-50 text-orange-700 border-orange-200'
        }`}
      >
        {founder.confidence_score >= 90 ? '✓ Verified' :
         founder.confidence_score >= 70 ? '~ Likely' : '? Estimated'}
      </Badge>
    )}
  </div>
)}

          {/* Contact Buttons */}
          <div className="flex flex-wrap gap-2 mb-5">
            
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

            {founder.bio && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {founder.bio}
            </p>
            )}

            {/* Show company description only if no bio */}
            {!founder.bio && cleanDescription && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {cleanDescription}
            </p>
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

          {/* Best Contact Method */}
          <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-100">
            <p className="text-sm font-medium text-orange-900 flex items-center gap-2">
              💡 Best way to reach: {getBestContactMethod()}
              {founder.confidence_score && founder.email && (
                <span className="text-xs text-orange-700">
                  ({founder.confidence_score}% confidence)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}