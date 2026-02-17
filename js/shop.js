/* ============================================
   FORGED - Shop Page JS
   Product filtering, sorting, and transitions
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    const filterTabs = document.querySelectorAll('.filter-tab');
    const sortSelect = document.getElementById('sort-select');
    const productGrid = document.getElementById('product-grid');

    if (!productGrid) return;

    const products = () => Array.from(productGrid.querySelectorAll('.product-card'));

    let activeCategory = 'all';

    // --- "No Products Found" Message ---
    const noResultsMsg = document.createElement('p');
    noResultsMsg.textContent = 'No products found.';
    noResultsMsg.className = 'no-results-msg text-center text-zinc-400 text-lg py-16 col-span-full hidden';
    productGrid.appendChild(noResultsMsg);

    // --- Filter Products by Category ---
    const filterProducts = (category) => {
        activeCategory = category;
        const items = products();
        let visibleCount = 0;

        items.forEach(item => {
            const match = category === 'all' || item.dataset.category === category;
            if (match) {
                item.classList.remove('hidden');
                visibleCount++;
            } else {
                item.classList.add('hidden');
            }
        });

        // Update the results count
        const countNumber = document.getElementById('count-number');
        if (countNumber) countNumber.textContent = visibleCount;

        // Show or hide the "no products" message
        const noResults = document.getElementById('no-results');
        if (visibleCount === 0) {
            noResultsMsg.classList.remove('hidden');
            if (noResults) noResults.classList.remove('hidden');
        } else {
            noResultsMsg.classList.add('hidden');
            if (noResults) noResults.classList.add('hidden');
        }
    };

    // --- Sort Products ---
    const sortProducts = (method) => {
        const items = products();

        items.sort((a, b) => {
            if (method === 'price-low') {
                return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
            }
            if (method === 'price-high') {
                return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
            }
            if (method === 'newest') {
                const dateA = a.dataset.date ? new Date(a.dataset.date) : 0;
                const dateB = b.dataset.date ? new Date(b.dataset.date) : 0;
                // Newest first: higher date value comes first
                return (dateB || 0) - (dateA || 0);
            }
            return 0;
        });

        // Re-append in sorted order (noResultsMsg stays at the end)
        items.forEach(item => productGrid.appendChild(item));
        productGrid.appendChild(noResultsMsg);
    };

    // --- Transition Wrapper ---
    // Briefly fades the grid out, applies the change, then fades back in.
    const transitionGrid = (changeFn) => {
        productGrid.style.transition = 'opacity 0.2s ease';
        productGrid.style.opacity = '0';

        const onFadeOut = () => {
            productGrid.removeEventListener('transitionend', onFadeOut);
            changeFn();
            // Force reflow so the browser registers opacity 0 before we flip to 1
            void productGrid.offsetHeight;
            productGrid.style.opacity = '1';
        };

        productGrid.addEventListener('transitionend', onFadeOut);

        // Safety fallback if transitionend never fires (e.g. reduced motion)
        setTimeout(() => {
            if (parseFloat(getComputedStyle(productGrid).opacity) < 1) {
                productGrid.removeEventListener('transitionend', onFadeOut);
                changeFn();
                productGrid.style.opacity = '1';
            }
        }, 300);
    };

    // --- Filter Tab Click Handlers ---
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const category = tab.dataset.filter;
            if (category === activeCategory) return;

            // Update active tab styling
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            transitionGrid(() => filterProducts(category));
        });
    });

    // --- Sort Dropdown Handler ---
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            transitionGrid(() => {
                sortProducts(sortSelect.value);
                // Re-apply current filter after sort
                filterProducts(activeCategory);
            });
        });
    }

    // --- Initial State ---
    // Mark the default "all" tab as active if none is set
    const hasActive = Array.from(filterTabs).some(t => t.classList.contains('active'));
    if (!hasActive && filterTabs.length > 0) {
        const allTab = Array.from(filterTabs).find(t => t.dataset.filter === 'all');
        if (allTab) allTab.classList.add('active');
    }

    // Apply initial filter (show everything) to set up the noResultsMsg state
    filterProducts(activeCategory);
});
