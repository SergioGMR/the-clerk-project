import fs from "node:fs/promises";
import path from "node:path";

// Directorio para almacenar los favoritos
export const FAVORITES_DIR = path.resolve("./src/data/favorites");

// Asegurar que existe el directorio de favoritos
export async function ensureFavoritesDir() {
    try {
        await fs.mkdir(FAVORITES_DIR, { recursive: true });
    } catch (error) {
        console.error("Error creating favorites directory:", error);
    }
}

// Obtener la ruta del archivo de favoritos para un usuario
export function getUserFavoritesPath(userId: string) {
    return path.join(FAVORITES_DIR, `${userId}.json`);
}

// Obtener favoritos de un usuario
export async function getUserFavorites(userId: string): Promise<string[]> {
    try {
        const filePath = getUserFavoritesPath(userId);
        const data = await fs.readFile(filePath, "utf-8");
        const parsedData = JSON.parse(data);
        return Array.isArray(parsedData) ? parsedData : [];
    } catch (error) {
        // Si no existe el archivo o hay error, devolver array vacío
        return [];
    }
}

// Guardar favoritos de usuario
export async function saveUserFavorites(userId: string, favorites: string[]): Promise<boolean> {
    try {
        await ensureFavoritesDir();
        const filePath = getUserFavoritesPath(userId);
        await fs.writeFile(filePath, JSON.stringify(favorites, null, 2), "utf-8");
        return true;
    } catch (error) {
        console.error("Error saving favorites:", error);
        return false;
    }
}