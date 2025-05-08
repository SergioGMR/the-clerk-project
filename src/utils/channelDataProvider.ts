/**
 * Channel data provider utility
 * Centralizes data fetching operations related to channels
 */

import { getChannels } from "./channelScraper";
import fs from "node:fs/promises";
import path from "node:path";
import type { Channel, ChannelGroup, ChannelDataResponse } from "../types/channel";

const CACHE_FILE_PATH = path.resolve("./src/data/channels.json");

/**
 * Get channel groups and flat channels list
 * @returns Promise<ChannelDataResponse>
 */
export async function getChannelData(): Promise<ChannelDataResponse> {
  let groups: ChannelGroup[] = [];
  let channels: Channel[] = [];
  let formattedDate = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

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
        formattedDate = new Intl.DateTimeFormat("es-ES", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(cacheData.lastUpdated));
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

/**
 * Get all unique categories from channels
 * @param channels Channel list
 * @returns Array of unique categories
 */
export function extractCategories(channels: Channel[]): string[] {
  return [
    ...new Set(
      channels
        .map((channel) => channel.category)
        .filter((category): category is string => typeof category === "string")
    ),
  ];
}