import type { APIRoute } from "astro";
import { getUserFavorites, saveUserFavorites } from "@utils/favoritesUtils";

// GET: Obtener favoritos del usuario
export const GET: APIRoute = async ({ locals }) => {
    const user = await locals.currentUser();

    if (!user) {
        return new Response(JSON.stringify({
            success: false,
            message: "Unauthorized"
        }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const favorites = await getUserFavorites(user.id);

        return new Response(JSON.stringify({
            success: true,
            favorites
        }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            message: "Error getting favorites"
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

// POST: Añadir o eliminar un favorito
export const POST: APIRoute = async ({ request, locals }) => {
    const user = await locals.currentUser();

    if (!user) {
        return new Response(JSON.stringify({
            success: false,
            message: "Unauthorized"
        }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const { channelId, action } = await request.json();

        if (!channelId || !action) {
            return new Response(JSON.stringify({
                success: false,
                message: "Missing required parameters"
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const favorites = await getUserFavorites(user.id);

        if (action === 'add') {
            // Evitar duplicados
            if (!favorites.includes(channelId)) {
                favorites.push(channelId);
            }
        } else if (action === 'remove') {
            const index = favorites.indexOf(channelId);
            if (index !== -1) {
                favorites.splice(index, 1);
            }
        }

        const success = await saveUserFavorites(user.id, favorites);

        if (success) {
            return new Response(JSON.stringify({
                success: true,
                favorites,
                message: action === 'add' ? "Added to favorites" : "Removed from favorites"
            }), {
                headers: { "Content-Type": "application/json" }
            });
        } else {
            throw new Error("Failed to save favorites");
        }
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            message: "Error processing favorites"
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};