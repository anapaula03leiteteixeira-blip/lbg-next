import { NextResponse } from 'next/server';
import catalog from '@/data/sku-catalog.json';

export async function GET() {
  return NextResponse.json(catalog);
}
