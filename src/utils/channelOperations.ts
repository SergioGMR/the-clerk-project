/**
 * Utility functions for common channel and group operations
 */

import type { Channel, ChannelGroup, ChannelFilter } from "../types/channel";

/**
 * Filter channels based on multiple criteria
 * @param channels List of channels to filter
 * @param filter Filter criteria
 * @returns Filtered list of channels
 */
export function filterChannels(channels: Channel[], filter: ChannelFilter): Channel[] {
  return channels.filter(channel => {
    // Filter by search term (name)
    if (filter.searchTerm && !channel.name.toLowerCase().includes(filter.searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      if (!channel.tags || !filter.tags.some(tag => channel.tags!.includes(tag))) {
        return false;
      }
    }
    
    // Filter by categories
    if (filter.categories && filter.categories.length > 0) {
      if (!channel.category || !filter.categories.includes(channel.category)) {
        return false;
      }
    }
    
    // Filter by quality
    if (filter.quality && channel.quality !== filter.quality) {
      return false;
    }
    
    // Filter by type
    if (filter.type && channel.type !== filter.type) {
      return false;
    }
    
    return true;
  });
}

/**
 * Filter groups based on multiple criteria
 * @param groups List of groups to filter
 * @param filter Filter criteria
 * @returns Filtered list of groups
 */
export function filterGroups(groups: ChannelGroup[], filter: ChannelFilter): ChannelGroup[] {
  return groups.filter(group => {
    // Filter by search term (name)
    if (filter.searchTerm && !group.displayName.toLowerCase().includes(filter.searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      if (!group.tags || !filter.tags.some(tag => group.tags.includes(tag))) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Get a group by its name
 * @param groups List of all groups
 * @param groupName Name of the group to find
 * @returns The found group or undefined
 */
export function getGroupByName(groups: ChannelGroup[], groupName: string): ChannelGroup | undefined {
  return groups.find(group => group.name === groupName);
}

/**
 * Get a channel by its ID
 * @param channels List of all channels
 * @param channelId ID of the channel to find
 * @returns The found channel or undefined
 */
export function getChannelById(channels: Channel[], channelId: string): Channel | undefined {
  return channels.find(channel => channel.id === channelId);
}

/**
 * Sort channels by specified criteria
 * @param channels List of channels to sort
 * @param sortBy Sort criteria ('name', 'quality', 'category')
 * @param sortOrder Sort order ('asc' or 'desc')
 * @returns Sorted list of channels
 */
export function sortChannels(
  channels: Channel[], 
  sortBy: 'name' | 'quality' | 'category' = 'name',
  sortOrder: 'asc' | 'desc' = 'asc'
): Channel[] {
  return [...channels].sort((a, b) => {
    let valueA: string;
    let valueB: string;
    
    switch (sortBy) {
      case 'quality':
        valueA = a.quality || '';
        valueB = b.quality || '';
        break;
      case 'category':
        valueA = a.category || '';
        valueB = b.category || '';
        break;
      case 'name':
      default:
        valueA = a.name;
        valueB = b.name;
    }
    
    // Compare values (case-insensitive)
    const comparison = valueA.toLowerCase().localeCompare(valueB.toLowerCase());
    
    // Apply sort order
    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

/**
 * Group channels by a specific property
 * @param channels List of channels to group
 * @param groupBy Property to group by ('category', 'quality', 'groupTitle')
 * @returns Record with groups of channels
 */
export function groupChannelsBy(
  channels: Channel[],
  groupBy: 'category' | 'quality' | 'groupTitle'
): Record<string, Channel[]> {
  const result: Record<string, Channel[]> = {};
  
  channels.forEach(channel => {
    const key = channel[groupBy] || 'Unknown';
    
    if (!result[key]) {
      result[key] = [];
    }
    
    result[key].push(channel);
  });
  
  return result;
}

/**
 * Get unique values for a specific channel property
 * @param channels List of channels
 * @param property Property to extract values from
 * @returns Array of unique values
 */
export function getUniqueValues<K extends keyof Channel>(
  channels: Channel[],
  property: K
): Array<NonNullable<Channel[K]>> {
  const values = channels
    .map(channel => channel[property])
    .filter(value => value != null);
    
  return [...new Set(values)] as Array<NonNullable<Channel[K]>>;
}

/**
 * Count channels in each category
 * @param channels List of channels
 * @returns Record with category counts
 */
export function countChannelsByCategory(channels: Channel[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  channels.forEach(channel => {
    const category = channel.category || 'Unknown';
    counts[category] = (counts[category] || 0) + 1;
  });
  
  return counts;
}