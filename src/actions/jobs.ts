'use server';

import {getRecentJobs} from "@/client/database";

export async function fetchRecentJobs() {
  return getRecentJobs();
}
