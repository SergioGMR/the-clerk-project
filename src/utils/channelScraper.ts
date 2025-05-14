/**
 * Channel scraper utility for extracting Acestream IDs and channel information
 * with JSON caching support
 */

import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Channel, ChannelGroup, ChannelData, GroupChannel } from '@/types/channel';

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
    // Intento de lectura optimizado con verificación de existencia
    try {
      const fileData = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
      const cacheData = JSON.parse(fileData) as ChannelData;

      // Validar la estructura básica del cache para evitar errores
      if (!cacheData || !Array.isArray(cacheData.groups)) {
        console.warn('Cache file exists but has invalid structure');
        return null;
      }

      // Check if cache is fresh enough
      if (cacheData.lastUpdated) {
        // Optimización: calcular la diferencia directamente
        const expired = new Date().getTime() - new Date(cacheData.lastUpdated).getTime() > CACHE_EXPIRATION;

        if (expired) {
          console.log('Cache expired, needs refresh');
          return null;
        }
      } else {
        console.log('Cache has no timestamp, needs refresh');
        return null;
      }

      return cacheData;
    } catch (readError) {
      // Comprobar si el error es de tipo 'archivo no encontrado'
      if (typeof readError === 'object' && readError !== null && 'code' in readError && readError.code === 'ENOENT') {
        console.log('Cache file does not exist, needs creation');
      } else {
        console.error('Error reading cache file:', readError);
      }
      return null;
    }
  } catch (error) {
    console.error('Unexpected error loading cache:', error);
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

    // Usar el primer ID de canal como base para el ID del grupo, o generar uno aleatorio
    const groupId = channelsList.length > 0 ? channelsList[0].id : Math.random().toString(36).substring(2, 15);

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
 * Obtiene el elemento más común en un array - Versión optimizada con Map
 */
function getMostCommonItem<T>(items: T[]): T {
  // Usar Map para mejor rendimiento con objetos como claves
  const counts = new Map<T, number>();

  // Contar ocurrencias de cada item
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }

  // Encontrar el item con mayor número de ocurrencias
  let maxItem: T = items[0];
  let maxCount = 0;

  counts.forEach((count, item) => {
    if (count > maxCount) {
      maxCount = count;
      maxItem = item;
    }
  });

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

  // Mapa de reglas para categorías y etiquetas basadas en el título del grupo
  const categoryRules = [
    { pattern: /fútbol|futbol|soccer|liga|champions|football/i, category: 'Sports', tags: ['Football', 'Soccer'] },
    { pattern: /ufc|fight|lucha|boxeo|boxing/i, category: 'Sports', tags: ['UFC', 'MMA', 'Fighting'] },
    { pattern: /baloncesto|basket|nba/i, category: 'Sports', tags: ['Basketball', 'NBA'] },
    { pattern: /deportes|sports/i, category: 'Sports', tags: ['Sports'] },
    { pattern: /películas|peliculas|movie|cine/i, category: 'Movies', tags: ['Movies'] },
    { pattern: /series|shows/i, category: 'Entertainment', tags: ['TV Shows', 'Series'] },
    { pattern: /documentales|documentary|documental/i, category: 'Documentary', tags: ['Documentary'] },
    { pattern: /noticias|news/i, category: 'News', tags: ['News'] },
    { pattern: /infantil|kids|niños/i, category: 'Kids', tags: ['Kids'] }
  ];

  // Usar el título del grupo para determinar categoría y etiquetas
  const groupLower = groupTitle.toLowerCase();

  // Buscar la primera regla que coincida
  const matchedRule = categoryRules.find(rule => rule.pattern.test(groupLower));

  if (matchedRule) {
    category = matchedRule.category;
    tags.push(...matchedRule.tags);
  } else {
    category = 'Entertainment';
    tags.push('Entertainment');
  }

  // Utilizar también el nombre del canal para añadir etiquetas más específicas
  const nameLower = name.toLowerCase();

  // Definir reglas para etiquetas basadas en el nombre del canal
  const nameRules = [
    { pattern: /dazn/i, tags: ['DAZN', 'Sports'] },
    { pattern: /espn/i, tags: ['ESPN', 'Sports'] },
    { pattern: /eurosport/i, tags: ['Eurosport', 'Sports'] },
    { pattern: /movistar\s*\+?/i, tags: ['Movistar+'] },
    {
      pattern: /liga\s*campeones|champions/i,
      tags: ['Champions League', 'Football'],
      category: 'Sports'
    },
    {
      pattern: /formula\s*1|f1/i,
      tags: ['Formula 1', 'Racing'],
      category: 'Sports'
    },
    {
      pattern: /tenis|tennis/i,
      tags: ['Tennis'],
      category: 'Sports'
    },
    {
      pattern: /golf/i,
      tags: ['Golf'],
      category: 'Sports'
    },
    {
      pattern: /ufc|mma/i,
      tags: ['UFC', 'MMA'],
      category: 'Sports'
    }
  ];

  // Aplicar todas las reglas que coincidan (pueden ser varias)
  nameRules.forEach(rule => {
    if (rule.pattern.test(nameLower)) {
      tags.push(...rule.tags);
      if (rule.category) {
        category = rule.category;
      }
    }
  });

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
  return channel.url || '#';
}

/**
 * Generate a thumbnail/logo for a channel based on its name
 * @param name Channel name
 * @param type Channel type (optional)
 * @returns Object with background color in hex format and initials
 */
export function getChannelLogo(name: string, type?: 'acestream' | 'url'): { backgroundColor: string, initials: string } {
  // Extract initials for the logo (up to 2 characters)
  const initials = name.slice(0, 2).toUpperCase();

  // Algoritmo de hash optimizado (djb2)
  let hash = 5381;
  const len = name.length;

  for (let i = 0; i < len; i++) {
    hash = ((hash << 5) + hash) + name.charCodeAt(i);
  }

  // Use different color ranges for acestream vs url channels
  let hue = Math.abs(hash) % 360;
  if (type === 'url') {
    hue = (hue + 180) % 360;
  }

  // Optimized HSL to Hex conversion with cached calculations
  const s = 0.7; // 70/100
  const l = 0.4; // 40/100
  const a = s * Math.min(l, 1 - l);

  // Pre-calcular valores comunes
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };

  const hexColor = `#${f(0)}${f(8)}${f(4)}`;

  return { backgroundColor: hexColor, initials };
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