import type { APIRoute } from "astro";
import { refreshChannelCache } from "@utils/channelScraper";

interface RefreshResponse {
  success: boolean;
  message: string;
  error?: string;
}

export const POST: APIRoute = async ({ request }): Promise<Response> => {
  try {
    // Force refresh the channel cache
    const success = await refreshChannelCache();
    
    const responseBody: RefreshResponse = success 
      ? {
          success: true,
          message: "Channel data refreshed successfully",
        }
      : {
          success: false,
          message: "Failed to refresh channel data",
        };

    return new Response(
      JSON.stringify(responseBody),
      {
        status: success ? 200 : 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error in refresh-channels endpoint:", error);
    
    const responseBody: RefreshResponse = {
      success: false,
      message: "Server error",
      error: error instanceof Error ? error.message : String(error)
    };

    return new Response(
      JSON.stringify(responseBody),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}