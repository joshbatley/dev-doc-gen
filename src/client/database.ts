import { neon } from '@neondatabase/serverless';

export const Healthcheck = async () => {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
};
