/**
 * Favorites management utility for client-side favorites handling
 */

/**
 * Load favorites from localStorage
 * @returns {string[]} Array of favorite channel IDs
 */
export function loadFavorites() {
    try {
        const storedFavorites = localStorage.getItem("favoriteChannels");
        return storedFavorites ? JSON.parse(storedFavorites) : [];
    } catch (error) {
        console.error("Error loading favorites:", error);
        return [];
    }
}

/**
 * Save favorites to localStorage
 * @param {string[]} favorites Array of favorite channel IDs
 */
export function saveFavorites(favorites) {
    try {
        localStorage.setItem("favoriteChannels", JSON.stringify(favorites));
        return true;
    } catch (error) {
        console.error("Error saving favorites:", error);
        return false;
    }
}

/**
 * Add a channel to favorites
 * @param {string} channelId Channel ID to add to favorites
 * @returns {boolean} Success status
 */
export function addFavorite(channelId) {
    try {
        const favorites = loadFavorites();
        if (!favorites.includes(channelId)) {
            favorites.push(channelId);
            saveFavorites(favorites);
        }
        return true;
    } catch (error) {
        console.error("Error adding favorite:", error);
        return false;
    }
}

/**
 * Remove a channel from favorites
 * @param {string} channelId Channel ID to remove from favorites
 * @returns {boolean} Success status
 */
export function removeFavorite(channelId) {
    try {
        const favorites = loadFavorites();
        const updatedFavorites = favorites.filter(id => id !== channelId);
        saveFavorites(updatedFavorites);
        return true;
    } catch (error) {
        console.error("Error removing favorite:", error);
        return false;
    }
}

/**
 * Check if a channel is in favorites
 * @param {string} channelId Channel ID to check
 * @returns {boolean} True if the channel is in favorites
 */
export function isFavorite(channelId) {
    const favorites = loadFavorites();
    return favorites.includes(channelId);
}

/**
 * Generate a consistent color based on a channel name
 * @param {string} name Channel name
 * @param {string} type Channel type (acestream or url)
 * @returns {string} CSS color string (hsl format)
 */
export function generateChannelColor(name, type) {
    const hash = name.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    // Use different color ranges for acestream vs url channels
    let hue = Math.abs(hash) % 360;
    if (type === 'url') {
        // Use more blue-ish colors for URL-based channels
        hue = (hue + 180) % 360;
    }

    return `hsl(${hue}, 70%, 40%)`;
}