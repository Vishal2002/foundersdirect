import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
if (!HUNTER_API_KEY) {
  console.error('❌ Missing HUNTER_API_KEY in .env');
  process.exit(1);
}

function getDomainFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function isValidDomain(domain: string | null): boolean {
  if (!domain) return false;
  return (
    domain.length > 3 &&
    domain.includes('.') &&
    !domain.endsWith('.pdf') &&
    !domain.includes('linkedin') &&
    !domain.includes('facebook') &&
    !domain.includes('twitter') &&
    !domain.includes('instagram') &&
    !domain.includes('ycombinator')
  );
}

function generateEmailPatterns(first: string, last: string, domain: string): string[] {
  const f = first.toLowerCase().replace(/[^a-z]/g, '');
  const l = last.toLowerCase().replace(/[^a-z]/g, '');

  return [
    `${f}@${domain}`,
    `${f}.${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${f[0]}${l}@${domain}`,
  ];
}

async function enrichEmails() {
  console.log('📧 Starting founder email enrichment...\n');

  const { data: founders, error } = await supabase
    .from('founders')
    .select('id, name, company_url, company')
    .is('email', null)
    .not('company_url', 'is', null)
    .not('name', 'ilike', '%restaurant%')
    .not('name', 'ilike', '%programs%')
    .limit(25); // Start with 25 for free tier

  if (error) {
    console.error('Failed to fetch founders:', error);
    return;
  }

  if (!founders?.length) {
    console.log('✅ No founders without emails found.');
    return;
  }

  console.log(`→ Processing ${founders.length} founders\n`);

  let enriched = 0;
  let generated = 0;
  let skipped = 0;

  for (const founder of founders) {
    const domain = getDomainFromUrl(founder.company_url!);

    if (!domain || !isValidDomain(domain)) {
      console.log(`⚠️  Skipping ${founder.name} - invalid domain: ${domain}`);
      skipped++;
      continue;
    }

    const nameParts = founder.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    console.log(`🔍 ${founder.name} @ ${domain} (${founder.company})`);

    try {
      // Try Hunter.io
      const response = await axios.get('https://api.hunter.io/v2/email-finder', {
        params: {
          domain,
          first_name: firstName,
          last_name: lastName,
          api_key: HUNTER_API_KEY,
        },
        timeout: 12000,
      });

      const data = response.data?.data;

      if (data?.email && data.score >= 70) {
        console.log(`   ✅ Found: ${data.email} (${data.score}% confidence)`);

        const { error: updateError } = await supabase
          .from('founders')
          .update({
            email: data.email,
            confidence_score: data.score,
          })
          .eq('id', founder.id);

        if (updateError) {
          console.error(`   ❌ DB Error:`, updateError.message);
        } else {
          enriched++;
        }
      } else {
        throw new Error('Low confidence or no email');
      }
    } catch (err: any) {
      const status = err.response?.status;

      if (status === 429) {
        console.log('   ⛔ Rate limit - stopping');
        break;
      }

      if (status === 401 || status === 403) {
        console.error('   ❌ Hunter API authentication failed');
        break;
      }

      // Fallback: generate pattern-based email
      const generatedEmail = generateEmailPatterns(firstName, lastName, domain)[0];
      console.log(`   📧 Generated: ${generatedEmail} (pattern-based)`);

      const { error: updateError } = await supabase
        .from('founders')
        .update({
          email: generatedEmail,
          confidence_score: 50,
        })
        .eq('id', founder.id);

      if (updateError) {
        console.error(`   ❌ DB Error:`, updateError.message);
      } else {
        generated++;
      }
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 2500));
  }

  console.log('\n─── Summary ───');
  console.log(`   ✅ Hunter-verified  : ${enriched}`);
  console.log(`   📧 Pattern-generated: ${generated}`);
  console.log(`   ⚠️  Skipped         : ${skipped}`);
  console.log(`   Total: ${enriched + generated + skipped}`);
}

enrichEmails().catch((err) => {
  console.error('❌ Script failed:', err);
});