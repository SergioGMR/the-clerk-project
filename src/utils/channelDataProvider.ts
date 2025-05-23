/**
 * Channel data provider utility
 * Centralizes data fetching operations related to channels
 */

import { getChannels } from "./channelScraper";
import fs from "node:fs/promises";
import path from "node:path";
import type { Channel, ChannelGroup, ChannelDataResponse } from "@/types/channel";

const CACHE_FILE_PATH = path.resolve("./src/data/channels.json");

/**
 * Get channel groups and flat channels list
 * @returns Promise<ChannelDataResponse>
 */
export async function getChannelData(): Promise<ChannelDataResponse> {
  let groups: ChannelGroup[] = [];
  let channels: Channel[] = [];

  // Crear formateador una sola vez para reutilizarlo
  const dateFormatter = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  let formattedDate = dateFormatter.format(new Date());

  try {
    // Try to read from cache file
    const fileData = await fs.readFile(CACHE_FILE_PATH, "utf-8");
    const cacheData = JSON.parse(fileData);

    if (cacheData && cacheData.groups) {
      groups = cacheData.groups;
      // Also get flat list of channels for count display
      channels = await getChannels();

      // Get formatted date from cache timestamp
      if (cacheData.lastUpdated) {
        formattedDate = dateFormatter.format(new Date(cacheData.lastUpdated));
      }
    } else {
      // Fallback to flat channel list if groups not available
      channels = await getChannels();
    }
  } catch (error) {
    console.error("Error reading channels data:", error);
    // Fallback to scraping if JSON read fails
    channels = await getChannels();
  }

  return { groups, channels, formattedDate };
}

/**
 * Get all unique tags from channel groups
 * @param groups Channel groups
 * @returns Array of unique tags
 */
export function extractAllTags(groups: ChannelGroup[]): string[] {
  return groups
    .flatMap((group) => group.tags || [])
    .filter((tag, index, self) => self.indexOf(tag) === index)
    .sort();
}

// Se eliminó la función extractCategories porque no se utilizaba