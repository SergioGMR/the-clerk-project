/**
 * Channel scraper utility for extracting Acestream IDs and channel information
 * with JSON caching support
 */

import fs from 'node:fs/promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'node:path';
import type { Channel, ChannelGroup, ChannelData, GroupChannel }
  from '../types/channel';

// Path to the JSON cache file
const CACHE_FILE_PATH = path.resolve('./src/data/channels.json');

// Cache expiration time (in milliseconds)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get channels with caching support
 * @param forceRefresh Force a refresh of the cache
 * @returns Promise<Channel[]> Array of channel objects
 */
export async function getChannels(forceRefresh = false): Promise<Channel[]> {
  try {
    // Check if cache file exists and is valid
    if (!forceRefresh) {
      const cacheData = await loadChannelsFromCache();
      if (cacheData) {
        console.log('Using cached channel data');
        // Convertir la estructura agrupada a una lista plana para compatibilidad
        return flattenChannelGroups(cacheData.groups);
      }
    }

    // If cache is invalid or force refresh, scrape the data
    console.log('Scraping fresh channel data');
    const channels = await scrapeAcestreamChannels();

    // Organizar canales en grupos y guardar en caché
    if (channels.length > 0) {
      const groups = organizeChannelsIntoGroups(channels);
      await saveGroupsToCache(groups);
    }
    return channels;
  } catch (error) {
    console.error('Error getting channels:', error);

    // Try to return cached data even if refresh failed
    try {
      const cacheData = await loadChannelsFromCache();
      if (cacheData) {
        console.log('Using cached channel data after failed refresh');
        return flattenChannelGroups(cacheData.groups);
      }
    } catch (e) {
      console.error('Failed to load from cache as fallback:', e);
    }

    return [];
  }
}

/**
 * Load channel data from cache file
 */
async function loadChannelsFromCache(): Promise<ChannelData | null> {
  try {
    const fileData = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
    const cacheData: ChannelData = JSON.parse(fileData);

    // Check if cache is fresh enough
    if (cacheData.lastUpdated) {
      const cacheTime = new Date(cacheData.lastUpdated).getTime();
      const now = new Date().getTime();

      if (now - cacheTime > CACHE_EXPIRATION) {
        console.log('Cache expired, needs refresh');
        return null;
      }
    } else {
      // No timestamp, consider cache invalid
      return null;
    }

    return cacheData;
  } catch (error) {
    console.error('Error loading from cache:', error);
    return null;
  }
}

/**
 * Save channel groups to cache file with the expected structure
 */
async function saveGroupsToCache(groups: ChannelGroup[]): Promise<void> {
  try {
    const cacheData: ChannelData = {
      lastUpdated: new Date().toISOString(),
      groups
    };

    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 4), 'utf-8');
    console.log('Channel data cached successfully');
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}

/**
 * Organiza los canales en grupos según el formato requerido
 */
function organizeChannelsIntoGroups(channels: Channel[]): ChannelGroup[] {
  // Agrupar canales por su groupTitle
  const groupsMap: Map<string, Channel[]> = new Map();

  channels.forEach(channel => {
    const groupTitle = channel.groupTitle || 'Otros';

    if (!groupsMap.has(groupTitle)) {
      groupsMap.set(groupTitle, []);
    }

    groupsMap.get(groupTitle)?.push(channel);
  });

  // Convertir mapa a la estructura de grupos esperada
  const groups: ChannelGroup[] = [];

  groupsMap.forEach((channelsList, groupTitle) => {
    // Determinar todas las etiquetas comunes en el grupo
    const groupTags = determineGroupTags(channelsList);

    // Crear un nombre técnico (slug) para el grupo
    const groupName = groupTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Usar el primer ID de canal como base para el ID del grupo
    const groupId = channelsList.length > 0 ? channelsList[0].id : generateRandomId();

    groups.push({
      id: groupId,
      name: groupName,
      displayName: groupTitle,
      tags: groupTags,
      channels: channelsList.map(channel => ({
        name: channel.name,
        id: channel.id,
        ...(channel.url && { url: channel.url }),
        ...(channel.quality && { quality: channel.quality }),
        category: channel.category || 'Entertainment',
        groupTitle: channel.groupTitle || 'Otros',
        tags: channel.tags || []
      }))
    });
  });

  return groups;
}

/**
 * Genera un ID aleatorio para grupos sin canales (caso extremo)
 */
function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Determina las etiquetas comunes para un grupo basado en los canales
 */
function determineGroupTags(channels: Channel[]): string[] {
  // Contar ocurrencias de cada etiqueta
  const tagCounts: Record<string, number> = {};

  channels.forEach(channel => {
    if (channel.tags) {
      channel.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }

    // Siempre incluir la categoría como una etiqueta
    if (channel.category) {
      tagCounts[channel.category] = (tagCounts[channel.category] || 0) + 1;
    }
  });

  // Seleccionar etiquetas que aparecen en al menos el 30% de los canales
  const minOccurrences = Math.max(1, Math.ceil(channels.length * 0.3));

  const groupTags = Object.entries(tagCounts)
    .filter(([_, count]) => count >= minOccurrences)
    .map(([tag, _]) => tag);

  // Si no hay etiquetas comunes, usar la categoría más común
  if (groupTags.length === 0) {
    const categories = channels.map(channel => channel.category || 'Entertainment');
    const mostCommonCategory = getMostCommonItem(categories);
    groupTags.push(mostCommonCategory);
  }

  return [...new Set(groupTags)]; // Eliminar duplicados
}

/**
 * Obtiene el elemento más común en un array
 */
function getMostCommonItem<T>(items: T[]): T {
  const counts = items.reduce((acc, item) => {
    acc[String(item)] = (acc[String(item)] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let maxItem: T = items[0];
  let maxCount = 0;

  for (const [item, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      // Convertir de nuevo al tipo original (aproximado)
      maxItem = items.find(i => String(i) === item) || items[0];
    }
  }

  return maxItem;
}

/**
 * Convierte la estructura de grupos a una lista plana de canales
 */
function flattenChannelGroups(groups: ChannelGroup[]): Channel[] {
  const channels: Channel[] = [];

  groups.forEach(group => {
    group.channels.forEach(channel => {
      channels.push({
        name: channel.name,
        id: channel.id,
        ...(channel.url && { url: channel.url }),
        quality: channel.quality,
        category: channel.category,
        groupTitle: channel.groupTitle,
        tags: channel.tags,
        type: channel.url?.startsWith('acestream://') ? 'acestream' : 'url'
      });
    });
  });

  return channels;
}

/**
 * Scrapes the website to extract Acestream channel data
 * @returns Promise<Channel[]> Array of channel objects
 */
export async function scrapeAcestreamChannels(): Promise<Channel[]> {
  try {
    const response = await fetch('https://www.robertofreijo.com/acestream-ids/');

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const channels: Channel[] = [];

    // Extract all toggle sections which contain channel information
    const togglePattern = /<h5\s+class="et_pb_toggle_title">([^<]+)<\/h5>[\s\S]*?<div\s+class="et_pb_toggle_content\s+clearfix">([\s\S]*?)<\/div>/g;

    let toggleMatch;
    while ((toggleMatch = togglePattern.exec(html)) !== null) {
      const groupTitle = toggleMatch[1].trim();
      const toggleContent = toggleMatch[2];

      // Process individual channel entries within this toggle section
      // Buscamos párrafos que siguen el patrón: "• Nombre del Canal<br>Enlace: <a href="...">..."
      const channelPattern = /<p>(?:•|&bull;|&#8226;)?\s*([^<]+)<br[^>]*>(?:Enlace|Link|URL)?:?\s*<a[^>]*href="(acestream:\/\/[a-zA-Z0-9]{40}|https?:\/\/tinyurl\.com\/[a-zA-Z0-9]+|https?:\/\/bit\.ly\/[a-zA-Z0-9]+|https?:\/\/(?:goo\.gl|t\.co|is\.gd|buff\.ly)\/[a-zA-Z0-9]+)"[^>]*>.*?<\/a><\/p>/g;

      let channelMatch;
      while ((channelMatch = channelPattern.exec(toggleContent)) !== null) {
        const channelName = channelMatch[1].trim();
        const channelUrl = channelMatch[2];

        // Procesar la información del canal
        const isAcestream = channelUrl.startsWith('acestream://');
        const { name, quality, category, tags } = processChannelInfo(channelName, groupTitle);

        if (isAcestream) {
          const aceId = channelUrl.replace('acestream://', '');
          channels.push({
            name,
            id: aceId,
            quality,
            category,
            groupTitle,
            tags,
            type: 'acestream'
          });
        } else {
          channels.push({
            name,
            id: uuidv4(),
            url: channelUrl,
            quality,
            category,
            groupTitle,
            tags,
            type: 'url'
          });
        }
      }

      // Rest of implementation remains the same...
    }

    console.log(`Scraped ${channels.length} channels successfully`);
    return channels;
  } catch (error) {
    console.error('Error scraping channel data:', error);
    return [];
  }
}

/**
 * Process channel information from name text and group title
 * @param nameText Text containing the channel name
 * @param groupTitle Title of the group/category from h5
 * @returns Processed channel info
 */
function processChannelInfo(nameText: string, groupTitle: string): {
  name: string;
  quality?: string;
  category?: string;
  tags: string[];
} {
  // Limpiar el nombre del canal
  let name = nameText.replace(/^\s*•\s*|\s*•\s*$/, '').trim();
  let quality: string | undefined = undefined;
  let category: string | undefined = undefined;
  let tags: string[] = [];

  // Intentar extraer información de calidad del nombre
  const qualityMatch = name.match(/(HD|SD|720p|1080p|\d+fps|4K|UHD)/i);
  if (qualityMatch) {
    quality = qualityMatch[0];
  }

  // Usar el título del grupo para determinar categoría y etiquetas
  const groupLower = groupTitle.toLowerCase();

  // Categorías basadas en el título del grupo
  if (/fútbol|futbol|soccer|liga|champions|football/i.test(groupLower)) {
    category = 'Sports';
    tags.push('Football', 'Soccer');
  }
  else if (/ufc|fight|lucha|boxeo|boxing/i.test(groupLower)) {
    category = 'Sports';
    tags.push('UFC', 'MMA', 'Fighting');
  }
  else if (/baloncesto|basket|nba/i.test(groupLower)) {
    category = 'Sports';
    tags.push('Basketball', 'NBA');
  }
  else if (/deportes|sports/i.test(groupLower)) {
    category = 'Sports';
    tags.push('Sports');
  }
  else if (/películas|peliculas|movie|cine/i.test(groupLower)) {
    category = 'Movies';
    tags.push('Movies');
  }
  else if (/series|shows/i.test(groupLower)) {
    category = 'Entertainment';
    tags.push('TV Shows', 'Series');
  }
  else if (/documentales|documentary|documental/i.test(groupLower)) {
    category = 'Documentary';
    tags.push('Documentary');
  }
  else if (/noticias|news/i.test(groupLower)) {
    category = 'News';
    tags.push('News');
  }
  else if (/infantil|kids|niños/i.test(groupLower)) {
    category = 'Kids';
    tags.push('Kids');
  }
  else {
    category = 'Entertainment';
    tags.push('Entertainment');
  }

  // Utilizar también el nombre del canal para añadir etiquetas más específicas
  const nameLower = name.toLowerCase();

  // Canales de deportes populares
  if (/dazn/i.test(nameLower)) {
    tags.push('DAZN', 'Sports');
  }
  if (/espn/i.test(nameLower)) {
    tags.push('ESPN', 'Sports');
  }
  if (/eurosport/i.test(nameLower)) {
    tags.push('Eurosport', 'Sports');
  }
  if (/movistar\s*\+?/i.test(nameLower)) {
    tags.push('Movistar+');
  }
  if (/liga\s*campeones|champions/i.test(nameLower)) {
    tags.push('Champions League', 'Football');
    category = 'Sports';
  }
  if (/formula\s*1|f1/i.test(nameLower)) {
    tags.push('Formula 1', 'Racing');
    category = 'Sports';
  }
  if (/tenis|tennis/i.test(nameLower)) {
    tags.push('Tennis');
    category = 'Sports';
  }
  if (/golf/i.test(nameLower)) {
    tags.push('Golf');
    category = 'Sports';
  }
  if (/ufc|mma/i.test(nameLower)) {
    tags.push('UFC', 'MMA');
    category = 'Sports';
  }

  // Eliminar duplicados de tags
  tags = [...new Set(tags)];

  return { name, quality, category, tags };
}

/**
 * Get the appropriate URL for a channel
 * @param channel The channel object
 * @returns The URL for the channel (acestream protocol or direct url)
 */
export function getChannelUrl(channel: Channel | GroupChannel): string {
  if (channel.type === 'acestream') {
    return `acestream://${channel.id}`;
  } else {
    return channel.url || '#';
  }
}

/**
 * Generate a thumbnail/logo for a channel based on its name
 * @param name Channel name
 * @param type Channel type (optional)
 * @returns URL to a generated placeholder logo
 */
export function getChannelLogo(name: string, type?: 'acestream' | 'url'): string {
  // Extract initials for the logo (up to 2 characters)
  const initials = name
    .split(/\s+/)
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Generate a consistent color based on the channel name
  const hash = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  // Use different color ranges for acestream vs url channels
  let hue = Math.abs(hash) % 360;
  if (type === 'url') {
    // Use more blue-ish colors for URL-based channels
    hue = (hue + 180) % 360;
  }

  const backgroundColor = `hsl(${hue}, 70%, 40%)`;
  const textColor = 'white';

  // Return a placeholder image URL with the channel's initials
  return `https://placehold.co/64x64/${backgroundColor.replace('#', '')}/${textColor}?text=${initials}`;
}

/**
 * Force refresh the channel cache
 * @returns Promise<boolean> Success status
 */
export async function refreshChannelCache(): Promise<boolean> {
  try {
    const channels = await scrapeAcestreamChannels();
    if (channels.length > 0) {
      const groups = organizeChannelsIntoGroups(channels);
      await saveGroupsToCache(groups);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to refresh channel cache:', error);
    return false;
  }
}