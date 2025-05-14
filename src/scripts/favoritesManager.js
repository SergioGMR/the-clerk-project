/**
 * Favorites management utility for server-side favorites handling
 */

// Configuración común para solicitudes fetch
const fetchConfig = {
    headers: {
        'Content-Type': 'application/json'
    }
};

/**
 * Load favorites from the server
 * @returns {Promise<string[]>} Promise resolving to array of favorite channel IDs
 */
export async function loadFavorites() {
    try {
        const response = await fetch('/api/favorites', fetchConfig);

        if (response.status === 401) {
            // Usuario no autenticado
            return [];
        }

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        return data.success && Array.isArray(data.favorites) ? data.favorites : [];
    } catch (error) {
        console.error("Error loading favorites:", error);
        return [];
    }
}

/**
 * Add a channel to favorites
 * @param {string} channelId Channel ID to add to favorites
 * @returns {Promise<boolean>} Promise resolving to success status
 */
export async function addFavorite(channelId) {
    try {
        const response = await fetch('/api/favorites', {
            ...fetchConfig,
            method: 'POST',
            body: JSON.stringify({
                channelId,
                action: 'add'
            })
        });

        if (response.status === 401) {
            // Si no está autenticado, mostrar mensaje
            alert("Debes iniciar sesión para guardar favoritos");
            return false;
        }

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        return !!data.success;
    } catch (error) {
        console.error("Error adding favorite:", error);
        return false;
    }
}

/**
 * Remove a channel from favorites
 * @param {string} channelId Channel ID to remove from favorites
 * @returns {Promise<boolean>} Promise resolving to success status
 */
export async function removeFavorite(channelId) {
    try {
        const response = await fetch('/api/favorites', {
            ...fetchConfig,
            method: 'POST',
            body: JSON.stringify({
                channelId,
                action: 'remove'
            })
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        return !!data.success;
    } catch (error) {
        console.error("Error removing favorite:", error);
        return false;
    }
}

/**
 * Check if a channel is in favorites
 * @param {string} channelId Channel ID to check
 * @returns {Promise<boolean>} Promise resolving to true if the channel is in favorites
 */
export async function isFavorite(channelId) {
    const favorites = await loadFavorites();
    return favorites.includes(channelId);
}

/**
 * Generate a consistent color based on a channel name
 * @param {string} name Channel name
 * @param {string} type Channel type (acestream or url)
 * @returns {string} CSS color string (hsl format)
 */
export function generateChannelColor(name, type) {
    // Más eficiente calcular el hash en un solo paso
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use different color ranges for acestream vs url channels
    let hue = Math.abs(hash) % 360;
    if (type === 'url') {
        hue = (hue + 180) % 360;
    }

    return `hsl(${hue}, 70%, 40%)`;
}