import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
if (!HUNTER_API_KEY) {
  console.error('Missing HUNTER_API_KEY in .env');
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
  // Very basic filter — skip obvious junk
  return (
    domain.length > 3 &&
    domain.includes('.') &&
    !domain.endsWith('.pdf') &&
    !domain.includes('linkedin') &&
    !domain.includes('facebook') &&
    !domain.includes('twitter') &&
    !domain.includes('instagram')
  );
}

function generateEmailPatterns(first: string, last: string, domain: string): string[] {
  const f = first.toLowerCase().replace(/[^a-z]/g, '');
  const l = last.toLowerCase().replace(/[^a-z]/g, '');

  return [
    `${f}@${domain}`,                    // john@ → most common for founders/CEOs
    `${f}.${l}@${domain}`,               // john.doe@
    `${f}${l}@${domain}`,                // johndoe@
    `${f[0]}${l}@${domain}`,             // jdoe@
    `${f[0]}.${l}@${domain}`,            // j.doe@
    `contact@${domain}`,                 // rare but sometimes real
  ];
}

function pickLikelyEmailPattern(first: string, last: string, domain: string): string {
  return generateEmailPatterns(first, last, domain)[0]; // most founder-like first
}

async function enrichEmails() {
  console.log('📧 Starting founder email enrichment...');

  // Adjust limit & filters as needed
  const { data: founders, error } = await supabase
    .from('founders')
    .select('id, name, company_url')
    .is('email', null)
    .not('company_url', 'is', null)
    .not('name', 'ilike', '%restaurant%')
    .not('name', 'ilike', '%programs%')
    .not('name', 'ilike', '%test%')
    .limit(80); // ← be kind to free tier + avoid rate limits too fast

  if (error) {
    console.error('Failed to fetch founders:', error);
    return;
  }

  if (!founders?.length) {
    console.log('No founders without emails found.');
    return;
  }

  console.log(`→ Processing ${founders.length} founders`);

  let enriched = 0;
  let generated = 0;
  let skipped = 0;

  for (const founder of founders) {
    const domain = getDomainFromUrl(founder.company_url!);

    if (!domain || !isValidDomain(domain)) {
      console.log(`  ⏭️ Skipping invalid domain: ${founder.company_url}`);
      skipped++;
      continue;
    }

    console.log(`  🔎 ${founder.name}  @  ${domain}`);

    // Prepare name parts
    const nameTrim = founder.name.trim();
    const nameParts = nameTrim.split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    try {
      // Hunter.io lookup
      const response = await axios.get('https://api.hunter.io/v2/email-finder', {
        params: {
          domain,
          first_name: firstName,
          last_name: lastName,
          // full_name: nameTrim,           // ← alternative: try this instead of split
          api_key: HUNTER_API_KEY,
        },
        timeout: 12000,
      });

      const data = response.data?.data;

      if (data?.email && data.score >= 75) {  // only accept decent confidence
        console.log(`     ✅ ${data.email}  (${data.score}%)`);

        await supabase
          .from('founders')
          .update({
            email: data.email,
            confidence_score: data.score,
            email_source: 'hunter.io',
            email_verified_at: new Date().toISOString(),
          })
          .eq('id', founder.id);

        enriched++;
      } else {
        throw new Error('No high-confidence email from Hunter');
      }
    } catch (err: any) {
      const status = err.response?.status;

      if (status === 429) {
        console.log('     ⛔ Rate limit hit — stopping early');
        break;
      }

      if (status === 401 || status === 403) {
        console.error('     ❌ Hunter API key issue — check credentials');
        break;
      }

      // Fallback generation
      const generatedEmail = pickLikelyEmailPattern(firstName, lastName, domain);
      console.log(`     📧 Generated fallback: ${generatedEmail}`);

      await supabase
        .from('founders')
        .update({
          email: generatedEmail,
          confidence_score: 50, // low confidence
          email_source: 'pattern_guess',
        })
        .eq('id', founder.id);

      generated++;
    }

    // Be polite to the API — Hunter free tier is ~50–100/day
    await new Promise((r) => setTimeout(r, 2200)); // ~1.5–2 req/sec
  }

  console.log('\n─── Summary ───');
  console.log(`   ✅ Hunter-enriched : ${enriched}`);
  console.log(`   📧 Pattern-generated: ${generated}`);
  console.log(`   ⏭️ Skipped           : ${skipped}`);
  console.log(`   Total processed     : ${enriched + generated + skipped}`);
}

enrichEmails().catch((err) => {
  console.error('Script failed:', err);
});