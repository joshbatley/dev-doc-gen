import { createClient } from '@libsql/client';
import { NextResponse } from 'next/server';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN
});

export const Healthcheck = async () => {
  try {
    await client.execute("SELECT 1");
    return true;
  } catch (error) {
    return false;
  }
};
