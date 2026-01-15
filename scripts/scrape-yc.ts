import 'dotenv/config';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface Founder {
  name: string;
  role: string;
  bio?: string;
  twitter_handle?: string;
  linkedin_url?: string;
  avatar_url?: string;
}

async function scrapeYCDirectory() {
  console.log('🚀 YC Companies & Founders Scraper – Clean v2');
  console.log('Current date:', new Date().toISOString().split('T')[0]);
  console.log('----------------------------------------');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  let totalCompanies = 0;
  let successful = 0;
  let totalFounders = 0;

  try {
    // Go to newest companies
    const startUrl = 'https://www.ycombinator.com/companies?sort=created_desc';
    console.log(`→ Loading directory: ${startUrl}`);
    await page.goto(startUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    await page.waitForSelector('a[href*="/companies/"]', { timeout: 45000 });

    // Get unique company detail page URLs
    const companyUrls = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/companies/"]'));
      const urls = anchors
        .map(a => (a as HTMLAnchorElement).href)
        .filter(href => /\/companies\/[a-z0-9-]+$/i.test(href));
      return [...new Set(urls)].slice(0, 80); // limit to avoid long runs
    });

    totalCompanies = companyUrls.length;
    console.log(`→ Found ${totalCompanies} unique companies to scrape`);

    for (let i = 0; i < companyUrls.length; i++) {
      const url = companyUrls[i];
      console.log(`\n[${i + 1}/${totalCompanies}] ${url.split('/').pop()}`);

      try {
        const result = await scrapeCompany(page, url);
        if (result.success) {
          successful++;
          totalFounders += result.foundersSaved;
        }
      } catch (err: any) {
        console.error(`   Failed: ${err.message}`);
      }

      // Polite delay
      await new Promise(r => setTimeout(r, 3500));
    }

  } catch (fatal) {
    console.error('Critical failure:', fatal);
  } finally {
    await browser.close();

    console.log('\n' + '='.repeat(50));
    console.log('Summary');
    console.log('  Companies processed :', totalCompanies);
    console.log('  Successfully scraped :', successful);
    console.log('  Total founders      :', totalFounders);
    console.log('='.repeat(50));
    console.log('Finished at', new Date().toLocaleString());
  }
}

async function scrapeCompany(page: any, url: string) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  const html = await page.content();
  const $ = cheerio.load(html);

  const companyName = $('h1').first().text().trim() || 'Unknown Company';

  // ─── Batch ───────────────────────────────────────────────────────
  let batch = 'Unknown';

  // 1. Key-value pair "Batch:"
  $('div.flex.flex-row.justify-between, div.flex.flex-row').each((_, el) => {
    const text = $(el).text().toLowerCase();
    if (text.includes('batch:')) {
      const value = $(el).find('span:last-child, div:last-child').text().trim();
      if (value && value !== 'Batch') {
        batch = value;
        return false;
      }
    }
  });

  // 2. Pill with year or W/S format
  if (batch === 'Unknown') {
    $('.yc-tw-Pill').each((_, pill) => {
      const t = $(pill).text().trim();
      if (t.match(/\b(20\d{2}|W\d{2}|S\d{2}|Winter|Summer)\b/i)) {
        batch = t;
        return false;
      }
    });
  }

  // 3. Broad fallback regex
  if (batch === 'Unknown') {
    const bodyText = $('body').text();
    const full = bodyText.match(/(Winter|Summer)\s*(\d{4})/i);
    if (full) {
      batch = `${full[1]} ${full[2]}`;
    } else {
      const short = bodyText.match(/\b([WS])(\d{2})\b/i);
      if (short) {
        batch = `${short[1] === 'W' ? 'Winter' : 'Summer'} 20${short[2]}`;
      }
    }
  }

  // ─── Website ─────────────────────────────────────────────────────
  let companyUrl = url; // fallback
  //@ts-ignore
  const siteLink = $('a[href^="http"][target="_blank"]').filter((_, el) => {
    const txt = $(el).text().trim();
    return txt.includes('http') || txt.includes('.') || txt.match(/\.(ai|com|io|co)$/i);
  }).first().attr('href');

  if (siteLink && !siteLink.includes('ycombinator')) {
    companyUrl = siteLink.trim();
  }

  console.log(`   ${companyName} • ${batch}`);
  console.log(`   ${companyUrl}`);

  // ─── Founders ────────────────────────────────────────────────────
  const founders: Founder[] = [];

  $('.ycdc-card-new, .ycdc-card').each((_, cardEl) => {
    const $card = $(cardEl);

    // Name from alt (most reliable)
    let name = $card.find('img').first().attr('alt')?.trim() || '';

    // Fallback to bold text
    if (!name) {
      name = $card.find('.font-bold, [class*="bold"]').first().text().trim();
    }

    if (!name || name.length < 4 || name.toLowerCase() === companyName.toLowerCase()) {
      return;
    }

    if (name.split(/\s+/).length < 2) return; // need first + last

    const role = $card.find('.text-gray-600').first().text().trim() || 'Founder';

    const bio = $card.find('.prose .whitespace-pre-line').first().text().trim().slice(0, 500) || undefined;

    const avatar_url = $card.find('img').first().attr('src')?.split('?')[0] || undefined;

    let linkedin_url = $card.find('a[href*="linkedin.com/in"]').attr('href') || undefined;

    let twitter_handle = '';
const socialLinks = $card.find('a[href*="twitter.com"], a[href*="x.com"]');
if (socialLinks.length > 0) {
  const href = socialLinks.first().attr('href') || '';
  // Extract username from end of URL
  const match = href.match(/\/([^/?#]+)\/?$/);
  if (match && match[1] !== 'intent' && match[1] !== 'share') {  // avoid fake links
    twitter_handle = match[1];
  }
}

// Alternative: if icon-based, look for class or data-tooltip with Twitter
if (!twitter_handle) {
  const twitterIcon = $card.find('[data-tooltip-content*="Twitter"], [aria-label*="Twitter"], .bg-image-twitter, [class*="twitter"]');
  if (twitterIcon.length) {
    const parentA = twitterIcon.closest('a');
    if (parentA.length) {
      const href = parentA.attr('href') || '';
      const match = href.match(/\/([^/?#]+)\/?$/);
      if (match) twitter_handle = match[1];
    }
  }
}

    founders.push({
      name,
      role,
      bio,
      twitter_handle: twitter_handle || undefined,
      linkedin_url,
      avatar_url,
    });

    console.log(`     → ${name} (${role})`);
  });

  if (founders.length === 0) {
    console.log('     No founders found');
    return { success: false, foundersSaved: 0 };
  }

  // ─── Save ────────────────────────────────────────────────────────
  let saved = 0;

  for (const founder of founders) {
    const { data: record } = await supabase
      .from('founders')
      .select('id')
      .eq('name', founder.name)
      .eq('company', companyName)
      .maybeSingle();

    const data = {
      name: founder.name,
      company: companyName,
      batch,
      role: founder.role,
      bio: founder.bio || null,
      twitter_handle: founder.twitter_handle || null,
      linkedin_url: founder.linkedin_url || null,
      avatar_url: founder.avatar_url || null,
      company_url: companyUrl,
      company_description: $('div.prose.max-w-full.whitespace-pre-line').first().text().trim().slice(0, 800) || null,
    };

    if (record) {
      await supabase.from('founders').update(data).eq('id', record.id);
      console.log(`     Updated: ${founder.name}`);
    } else {
      const { error } = await supabase.from('founders').insert(data);
      if (!error) {
        console.log(`     Saved: ${founder.name}`);
        saved++;
      } else {
        console.error(`     DB error: ${error.message}`);
      }
    }
  }

  return { success: true, foundersSaved: saved };
}

scrapeYCDirectory().catch(err => {
  console.error('Script crashed:', err);
  process.exit(1);
});