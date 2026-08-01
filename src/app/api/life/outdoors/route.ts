import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/life';
import { outdoorsReport } from '@/lib/outdoors';
import { reverseGeocode } from '@/lib/life-providers';

/**
 * GET /api/life/outdoors?activity=fishing|hunting&lat=&lng=&email=
 * "What's in season near me right now." Uses the passed lat/lng if present
 * (so it works when you're traveling / out of state), else the profile's last
 * known location, else the profile city. Region is resolved with free OSM
 * reverse geocoding. Always returns a legal disclaimer.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const activity = (url.searchParams.get('activity') === 'hunting' ? 'hunting' : 'fishing') as 'fishing' | 'hunting';
    const me = await getOrCreateProfile(url.searchParams.get('email'));

    const lat = url.searchParams.get('lat') ? Number(url.searchParams.get('lat')) : me.lastLat;
    const lng = url.searchParams.get('lng') ? Number(url.searchParams.get('lng')) : me.lastLng;

    let region = me.city || 'your area';
    let traveling = false;
    if (lat != null && lng != null) {
      const geo = await reverseGeocode(lat, lng);
      if (geo.state) {
        region = geo.state;
        // Flag when they're somewhere other than their home city.
        if (me.city && geo.city && !me.city.toLowerCase().includes(geo.city.toLowerCase())) traveling = true;
      }
    }

    const report = outdoorsReport(activity, region, new Date());
    return NextResponse.json({ ...report, traveling }, { status: 200 });
  } catch (err) {
    console.error('GET /life/outdoors error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
