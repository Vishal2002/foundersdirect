import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';

// Load environment variables from .env.local file
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface Founder {
  name: string;
  role?: string;
  twitter_handle?: string;
  linkedin_url?: string;
}

interface Company {
  name: string;
  batch: string;
  url: string;
  description?: string;
  industry?: string;
  location?: string;
}

async function scrapeYCDirectory() {
  console.log('🚀 Starting YC scraper...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  
  try {
    // Go to YC companies directory
    console.log('📄 Loading YC directory...');
    await page.goto('https://www.ycombinator.com/companies', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for content to load
    await page.waitForSelector('a[href*="/companies/"]', { timeout: 30000 });
    
    // Scroll to load all companies (lazy loading)
    console.log('📜 Scrolling to load all companies...');
    await autoScroll(page);
    
    // Get all company links
    const companyLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/companies/"]'));
      return links
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => href.match(/\/companies\/[^/]+$/))
        .filter((href, index, self) => self.indexOf(href) === index); // Remove duplicates
    });
    
    console.log(`✅ Found ${companyLinks.length} companies`);
    
    // Process each company
    let processedCount = 0;
    for (const link of companyLinks.slice(0, 100)) { // Start with 100 companies for testing
      try {
        console.log(`\n[${++processedCount}/${Math.min(100, companyLinks.length)}] Processing: ${link}`);
        await scrapeCompanyPage(page, link);
        
        // Be nice to YC servers - wait between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Error processing ${link}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
    console.log('\n🎉 Scraping complete!');
  }
}

async function scrapeCompanyPage(page: any, url: string) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  
  const html = await page.content();
  const $ = cheerio.load(html);
  
  // Extract company info
  const companyName = $('h1').first().text().trim();
  
  // Find batch (usually in format like "W21", "S22")
  //@ts-ignore
  const batchMatch = $.text().match(/\b([WS]\d{2})\b/);
  const batch = batchMatch ? batchMatch[1] : 'Unknown';
  
  // Get description
  const description = $('div[class*="Company_description"]').first().text().trim() ||
                     $('meta[property="og:description"]').attr('content') || '';
  
  // Get location
  const location = $('div:contains("Location")').next().text().trim() ||
                  $('span:contains("📍")').parent().text().replace('📍', '').trim();
  
  // Get industry/tags
  const tags = $('a[href*="/companies?tags="]')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const industry = tags.length > 0 ? tags.join(', ') : '';
  
  console.log(`   Company: ${companyName} (${batch})`);
  
  // Extract founders
  const founders: Founder[] = [];
  
  // Method 1: Look for founder sections
  $('div:contains("Founder"), div:contains("Co-founder"), div:contains("CEO")').each((_, el) => {
    const $section = $(el);
    const text = $section.text();
    
    // Extract name (usually in bold or heading)
    const nameEl = $section.find('strong, b, h3, h4').first();
    const name = nameEl.text().trim();
    
    if (name && name.length > 2 && name.length < 50) {
      const founder: Founder = { name };
      
      // Extract role
      const roleMatch = text.match(/(CEO|CTO|Co-founder|Founder|President)/i);
      if (roleMatch) {
        founder.role = roleMatch[1];
      }
      
      // Extract social links
      const twitterLink = $section.find('a[href*="twitter.com"], a[href*="x.com"]').attr('href');
      if (twitterLink) {
        const match = twitterLink.match(/(?:twitter\.com|x\.com)\/([^/?]+)/);
        if (match) founder.twitter_handle = match[1];
      }
      
      const linkedinLink = $section.find('a[href*="linkedin.com"]').attr('href');
      if (linkedinLink) {
        founder.linkedin_url = linkedinLink;
      }
      
      founders.push(founder);
      console.log(`   👤 Founder: ${name} ${founder.role ? `(${founder.role})` : ''}`);
    }
  });
  
  // Method 2: Look in team section
  if (founders.length === 0) {
    $('div[class*="Team"], section:contains("Team")').find('a[href*="linkedin.com"]').each((_, el) => {
      const $el = $(el);
      const name = $el.text().trim() || $el.closest('div').find('strong, b').first().text().trim();
      
      if (name && name.length > 2) {
        const founder: Founder = {
          name,
          linkedin_url: $el.attr('href')
        };
        
        // Check for Twitter nearby
        const twitterLink = $el.parent().find('a[href*="twitter.com"], a[href*="x.com"]').attr('href');
        if (twitterLink) {
          const match = twitterLink.match(/(?:twitter\.com|x\.com)\/([^/?]+)/);
          if (match) founder.twitter_handle = match[1];
        }
        
        founders.push(founder);
        console.log(`   👤 Founder: ${name}`);
      }
    });
  }
  
  // Save to database
  if (founders.length > 0) {
    for (const founder of founders) {
      try {
        const { error } = await supabase.from('founders').insert({
          name: founder.name,
          company: companyName,
          batch: batch,
          role: founder.role,
          twitter_handle: founder.twitter_handle,
          linkedin_url: founder.linkedin_url,
          company_url: url,
          company_description: description.substring(0, 500),
          industry: industry.substring(0, 200),
          location: location.substring(0, 100),
        });
        
        if (error) {
          // Check if it's a duplicate
          if (error.code === '23505') {
            console.log(`   ⚠️  Duplicate: ${founder.name} already exists`);
          } else {
            console.error(`   ❌ DB Error for ${founder.name}:`, error.message);
          }
        } else {
          console.log(`   ✅ Saved: ${founder.name}`);
        }
      } catch (err) {
        console.error(`   ❌ Error saving ${founder.name}:`, err);
      }
    }
  } else {
    console.log(`   ⚠️  No founders found`);
  }
}

// Auto-scroll function to handle lazy loading
async function autoScroll(page: any) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// Run the scraper
scrapeYCDirectory().catch(console.error);