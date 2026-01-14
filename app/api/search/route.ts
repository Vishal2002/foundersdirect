import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const batch = searchParams.get('batch');
  const industry = searchParams.get('industry');
  
  if (!query && !batch && !industry) {
    return NextResponse.json({ founders: [], total: 0 });
  }

  try {
    let dbQuery = supabaseAdmin
      .from('founders')
      .select('*', { count: 'exact' });

    // Text search
    if (query) {
      dbQuery = dbQuery.or(
        `name.ilike.%${query}%,company.ilike.%${query}%,batch.ilike.%${query}%`
      );
    }

    // Filter by batch
    if (batch && batch !== 'all') {
      dbQuery = dbQuery.eq('batch', batch);
    }

    // Filter by industry
    if (industry && industry !== 'all') {
      dbQuery = dbQuery.ilike('industry', `%${industry}%`);
    }

    const { data, error, count } = await dbQuery
      .order('name', { ascending: true })
      .limit(50);

    if (error) throw error;

    // Log search for analytics
    await supabaseAdmin.from('searches').insert({
      query: query || `batch:${batch} industry:${industry}`,
      results_count: count || 0,
    });

    return NextResponse.json({
      founders: data || [],
      total: count || 0,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}