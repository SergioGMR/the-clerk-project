/**
 * Type definitions for channels, groups, and related data structures
 */

/**
 * Represents a single channel
 */
export interface Channel {
  name: string;          // Display name of the channel
  id: string;            // Unique identifier for the channel
  url?: string;          // URL for direct access (for URL type channels)
  quality?: string;      // Video quality (e.g., HD, 1080p, 720p)
  category?: string;     // General category (e.g., Sports, Movies)
  groupTitle?: string;   // Title of the parent group
  tags?: string[];       // Tags for filtering and categorization
  type: 'acestream' | 'url'; // Channel type
}

/**
 * Represents a channel that belongs to a group
 */
export interface GroupChannel {
  name: string;          // Display name of the channel
  id: string;            // Unique identifier
  url?: string;          // URL for direct channels
  quality?: string;      // Video quality
  category?: string;     // General category
  groupTitle: string;    // Title of the parent group
  tags: string[];        // Tags for filtering
}

/**
 * Represents a group of channels
 */
export interface ChannelGroup {
  id: string;            // Unique group identifier
  name: string;          // Technical name/slug of the group
  displayName: string;   // Human-readable group name
  tags: string[];        // Tags for the entire group
  channels: GroupChannel[]; // Channels in this group
}

/**
 * Response format from channelDataProvider
 */
export interface ChannelDataResponse {
  groups: ChannelGroup[];
  channels: Channel[];
  formattedDate: string;
}

/**
 * Cached channel data format
 */
export interface ChannelData {
  lastUpdated: string;   // ISO date string of last update
  groups: ChannelGroup[]; // Groups of channels
}

/**
 * Channel filter criteria
 */
export interface ChannelFilter {
  searchTerm?: string;
  tags?: string[];
  categories?: string[];
  quality?: string;
  type?: 'acestream' | 'url';
}