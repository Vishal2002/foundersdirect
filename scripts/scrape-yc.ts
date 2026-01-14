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
  console.log('🚀 Starting improved YC scraper...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  
  try {
    console.log('📄 Loading YC directory...');
    await page.goto('https://www.ycombinator.com/companies', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await page.waitForSelector('a[href*="/companies/"]', { timeout: 30000 });
    
    // Scroll to load companies
    console.log('📜 Scrolling to load companies...');
    await autoScroll(page);
    
    // Get company links
    const companyLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/companies/"]'));
      return links
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => href.match(/\/companies\/[a-z0-9-]+$/))
        .filter((href, index, self) => self.indexOf(href) === index);
    });
    
    console.log(`✅ Found ${companyLinks.length} companies\n`);
    
    // Process each company
    let processedCount = 0;
    const totalToProcess = Math.min(200, companyLinks.length); // Process 200 companies
    
    for (const link of companyLinks.slice(0, totalToProcess)) {
      try {
        console.log(`[${++processedCount}/${totalToProcess}] ${link}`);
        await scrapeCompanyPage(page, link);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Error: ${error}`);
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
  
  // Get batch from various locations
  let batch = 'Unknown';
  
  // Try to find batch in the page
  $('div, span, a').each((_, el) => {
    const text = $(el).text().trim();
    const batchMatch = text.match(/\b([WS]\d{2})\b/);
    if (batchMatch && !batch.includes('W') && !batch.includes('S')) {
      batch = batchMatch[1];
    }
  });
  
  // Get description
  const description = $('div.prose').first().text().trim() ||
                     $('meta[property="og:description"]').attr('content') || '';
  
  // Get location
  let location = '';
  $('div, span').each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes('📍') || text.includes('Location')) {
      location = text.replace('📍', '').replace('Location:', '').trim();
    }
  });
  
  // Get tags/industry
  const tags: string[] = [];
  $('a[href*="/companies?tags="]').each((_, el) => {
    const tag = $(el).text().trim();
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  });
  const industry = tags.slice(0, 3).join(', ');
  
  console.log(`   📦 ${companyName} (${batch})`);
  
  // Extract founders from "Active Founders" section
  const founders: Founder[] = [];
  
  // Look for the "Active Founders" section
  const foundersSection = $('div.prose:contains("Active Founders")').parent();
  
  if (foundersSection.length > 0) {
    // Find all founder cards within this section
    foundersSection.find('.ycdc-card-new').each((_, card) => {
      const $card = $(card);
      
      // Extract avatar
      const avatarUrl = $card.find('img').first().attr('src');
      
      // Extract name
      const nameEl = $card.find('.font-bold').first();
      const name = nameEl.text().trim();
      
      // Skip if name is empty or looks invalid
      if (!name || name.length < 3 || name.includes('Active Founders')) {
        return;
      }
      
      // Extract role
      const roleEl = $card.find('.text-gray-600').first();
      let role = roleEl.text().trim();
      if (!role) {
        role = 'Founder';
      }
      
      // Extract bio
      const bioEl = $card.find('.prose.max-w-full');
      const bio = bioEl.text().trim();
      
      // Extract Twitter
      let twitter_handle = '';
      const twitterLink = $card.find('a[href*="twitter.com"], a[href*="x.com"]').attr('href');
      if (twitterLink) {
        const match = twitterLink.match(/(?:twitter\.com|x\.com)\/([^/?]+)/);
        if (match) twitter_handle = match[1];
      }
      
      // Extract LinkedIn
      const linkedin_url = $card.find('a[href*="linkedin.com"]').attr('href') || '';
      
      founders.push({
        name,
        role,
        bio: bio.substring(0, 500),
        twitter_handle,
        linkedin_url,
        avatar_url: avatarUrl && avatarUrl.startsWith('http') ? avatarUrl.split('?')[0] : undefined,
      });
      
      console.log(`   👤 ${name} - ${role}`);
      if (twitter_handle) console.log(`      🐦 @${twitter_handle}`);
      if (linkedin_url) console.log(`      💼 LinkedIn`);
    });
  } else {
    // Fallback: try other methods
    console.log(`   ⚠️  No "Active Founders" section found, trying fallback...`);
    
    // Look for founder info in team section or anywhere on the page
    $('.font-bold').each((_, el) => {
      const $el = $(el);
      const name = $el.text().trim();
      
      // Validate name
      if (!name || 
          name.length < 3 || 
          name.length > 50 ||
          name.includes('Active') ||
          name.includes('Team') ||
          name.includes('Founders') ||
          /\d{4}/.test(name)) {
        return;
      }
      
      // Check if this is likely a person's name (has at least 2 words)
      if (name.split(' ').length < 2) return;
      
      const $container = $el.closest('div').parent();
      
      let role = 'Founder';
      $container.find('.text-gray-600').each((_, roleEl) => {
        const roleText = $(roleEl).text().trim();
        if (roleText && roleText.length < 50) {
          role = roleText;
        }
      });
      
      const twitter_handle = $container.find('a[href*="twitter.com"], a[href*="x.com"]').attr('href')?.match(/(?:twitter\.com|x\.com)\/([^/?]+)/)?.[1] || '';
      const linkedin_url = $container.find('a[href*="linkedin.com"]').attr('href') || '';
      const avatar_url = $container.find('img').first().attr('src')?.split('?')[0];
      
      // Check if we already have this founder
      if (!founders.some(f => f.name === name)) {
        founders.push({
          name,
          role,
          twitter_handle,
          linkedin_url,
          avatar_url: avatar_url && avatar_url.startsWith('http') ? avatar_url : undefined,
        });
        
        console.log(`   👤 ${name} - ${role}`);
      }
    });
  }
  
  // Save to database
  if (founders.length > 0) {
    for (const founder of founders) {
      try {
        // Check if founder already exists
        const { data: existing } = await supabase
          .from('founders')
          .select('id')
          .eq('name', founder.name)
          .eq('company', companyName)
          .single();
        
        if (existing) {
          // Update existing
          await supabase
            .from('founders')
            .update({
              role: founder.role,
              bio: founder.bio,
              twitter_handle: founder.twitter_handle || undefined,
              linkedin_url: founder.linkedin_url || undefined,
              avatar_url: founder.avatar_url || undefined,
              batch: batch,
              company_description: description.substring(0, 500),
              industry: industry,
              location: location,
            })
            .eq('id', existing.id);
          
          console.log(`   ✏️  Updated: ${founder.name}`);
        } else {
          // Insert new
          const { error } = await supabase.from('founders').insert({
            name: founder.name,
            company: companyName,
            batch: batch,
            role: founder.role,
            bio: founder.bio,
            twitter_handle: founder.twitter_handle || undefined,
            linkedin_url: founder.linkedin_url || undefined,
            avatar_url: founder.avatar_url || undefined,
            company_url: url,
            company_description: description.substring(0, 500),
            industry: industry,
            location: location,
          });
          
          if (error) {
            console.error(`   ❌ Error saving ${founder.name}:`, error.message);
          } else {
            console.log(`   ✅ Saved: ${founder.name}`);
          }
        }
      } catch (err) {
        console.error(`   ❌ Error processing ${founder.name}:`, err);
      }
    }
  } else {
    console.log(`   ⚠️  No founders found`);
  }
}

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

scrapeYCDirectory().catch(console.error);