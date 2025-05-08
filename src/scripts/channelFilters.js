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

    groupElements.forEach((group) => {
        const groupName = group.dataset.displayName.toLowerCase();
        const groupTags = group.dataset.tags
            ? group.dataset.tags.split(",")
            : [];

        // Check if all filter criteria match
        const searchMatch = !searchTerm || groupName.includes(searchTerm);

        // Check if any selected tag is present in group tags
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
    tagItems.forEach((item) => {
        const tagText = item
            .querySelector("span")
            .textContent.toLowerCase();
        if (!searchTerm || tagText.includes(searchTerm)) {
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
    document.querySelectorAll('a[href^="acestream://"]').forEach((link) => {
        link.addEventListener("click", (e) => {
            // Only for devices that might not support acestream protocol
            if (navigator.userAgent.match(/Android|iPhone|iPad|iPod|Mobile/i)) {
                e.preventDefault();
                const text = link.href;

                try {
                    navigator.clipboard.writeText(text).then(() => {
                        alert("Acestream link copied to clipboard!");
                    });
                } catch (err) {
                    prompt("Copy this Acestream link:", text);
                }
            }
        });
    });
}