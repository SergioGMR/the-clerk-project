import type { APIRoute } from "astro";
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ChannelData } from "@/types/channel";

const CACHE_FILE_PATH = path.resolve('./src/data/channels.json');

export const GET: APIRoute = async ({ request }): Promise<Response> => {
  try {
    // Read the channels data file
    const fileData = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
    const channelData: ChannelData = JSON.parse(fileData);

    // Set CORS headers to allow cross-origin requests
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Access-Control-Allow-Origin', '*'); // Allow any origin to access the API
    headers.set('Access-Control-Allow-Methods', 'GET');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // Return the channel data as JSON
    return new Response(JSON.stringify(channelData), {
      status: 200,
      headers
    });
  } catch (error) {
    console.error("Error serving channel data:", error);
    
    return new Response(
      JSON.stringify({
        error: "Failed to load channel data",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export const OPTIONS: APIRoute = ({ request }) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}