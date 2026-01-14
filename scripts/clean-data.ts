import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function cleanData() {
  console.log('🧹 Cleaning data...');

  // Get all founders
  const { data: founders } = await supabase
    .from('founders')
    .select('*');

  for (const founder of founders || []) {
    const updates: any = {};

    // Clean name - remove extra spaces, titles
    if (founder.name) {
      updates.name = founder.name
        .replace(/\s+/g, ' ')
        .replace(/\(.*?\)/g, '') // Remove parentheses content
        .trim();
    }

    // Clean company name
    if (founder.company) {
      updates.company = founder.company
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Clean description
    if (founder.company_description) {
      updates.company_description = founder.company_description
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, ' ')
        .trim()
        .substring(0, 500);
    }

    // Clean industry
    if (founder.industry) {
      updates.industry = founder.industry
        .split(',')
        .slice(0, 3) // Keep only first 3 tags
        .join(', ')
        .trim();
    }

    // Clean location
    if (founder.location) {
      updates.location = founder.location
        .replace(/\s+/g, ' ')
        .replace(/📍/g, '')
        .trim()
        .substring(0, 100);
    }

    // Update if there are changes
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('founders')
        .update(updates)
        .eq('id', founder.id);
      
      console.log(`✅ Cleaned: ${updates.name || founder.name}`);
    }
  }

  console.log('✅ Data cleaning complete!');
}

cleanData();