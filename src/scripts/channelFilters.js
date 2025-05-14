/**
 * Channel filtering utilities for client-side filtering
 */

/**
 * Apply filters to channel group elements based on search term and tags
 * 
 * @param {NodeListOf<Element>} groupElements All group elements
 * @param {string} searchTerm Search term to filter by
 * @param {string[]} selectedTags Tags to filter by
 * @param {HTMLElement|null} countElement Element to update with count
 * @param {HTMLElement|null} noResultsElement Element to show when no results
 * @returns {number} Count of visible elements after filtering
 */
export function filterGroups(groupElements, searchTerm, selectedTags, countElement, noResultsElement) {
    let visibleCount = 0;

    // Optimización: verificar si se necesita filtrado
    const needsFiltering = searchTerm || selectedTags.length > 0;

    if (!needsFiltering) {
        // Si no hay filtros, simplemente mostrar todos
        groupElements.forEach((group) => {
            group.classList.remove("hidden");
            visibleCount++;
        });
    } else {
        // Aplicar filtrado
        const searchTermLower = searchTerm ? searchTerm.toLowerCase() : "";

        groupElements.forEach((group) => {
            const groupName = group.dataset.displayName.toLowerCase();
            const groupTags = group.dataset.tags ? group.dataset.tags.split(",") : [];

            // Optimización: verificar primero el filtro más discriminatorio
            const searchMatch = !searchTerm || groupName.includes(searchTermLower);

            let tagsMatch = true;
            if (selectedTags.length > 0) {
                tagsMatch = selectedTags.some((tag) => groupTags.includes(tag));
            }

            if (searchMatch && tagsMatch) {
                group.classList.remove("hidden");
                visibleCount++;
            } else {
                group.classList.add("hidden");
            }
        });
    }

    // Update the count and show/hide no results message
    if (countElement) {
        countElement.textContent = visibleCount.toString();
    }

    if (noResultsElement) {
        if (visibleCount === 0) {
            noResultsElement.classList.remove("hidden");
        } else {
            noResultsElement.classList.add("hidden");
        }
    }

    return visibleCount;
}

/**
 * Filter tag elements in the sidebar based on search term
 * 
 * @param {NodeListOf<Element>} tagItems Tag item elements
 * @param {string} searchTerm Search term to filter by
 */
export function filterTags(tagItems, searchTerm) {
    // Si no hay término de búsqueda, mostramos todos sin recorrer cada uno
    if (!searchTerm) {
        tagItems.forEach((item) => item.classList.remove("hidden"));
        return;
    }

    // Preparar una sola vez el término de búsqueda
    const searchTermLower = searchTerm.toLowerCase();

    tagItems.forEach((item) => {
        const tagText = item.querySelector("span").textContent.toLowerCase();
        if (tagText.includes(searchTermLower)) {
            item.classList.remove("hidden");
        } else {
            item.classList.add("hidden");
        }
    });
}

/**
 * Set up event handlers for acestream protocol links
 * Handles special case for mobile devices
 */
export function setupAcestreamHandlers() {
    // Detectar solo una vez si es un dispositivo móvil
    const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    // Solo añadir listeners si es un dispositivo móvil
    if (isMobileDevice) {
        document.querySelectorAll('a[href^="acestream://"]').forEach((link) => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const text = link.href;

                try {
                    navigator.clipboard.writeText(text)
                        .then(() => alert("Acestream link copied to clipboard!"))
                        .catch(() => prompt("Copy this Acestream link:", text));
                } catch (err) {
                    prompt("Copy this Acestream link:", text);
                }
            });
        });
    }
}