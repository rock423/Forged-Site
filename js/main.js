/* ============================================
   FORGED - Shared JS
   Nav, mobile menu, scroll effects, utilities
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu Toggle ---
    const menuBtn = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuClose = document.getElementById('menu-close');

    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', () => {
            mobileMenu.classList.add('open');
            document.body.style.overflow = 'hidden';
        });

        if (menuClose) {
            menuClose.addEventListener('click', () => {
                mobileMenu.classList.remove('open');
                document.body.style.overflow = '';
            });
        }

        // Close menu on link click
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // --- Sticky Header Background on Scroll ---
    const header = document.getElementById('site-header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('bg-background-dark/95', 'backdrop-blur-md', 'shadow-lg');
            } else {
                header.classList.remove('bg-background-dark/95', 'backdrop-blur-md', 'shadow-lg');
            }
        }, { passive: true });
    }

    // --- Scroll Fade-In Animation ---
    const fadeEls = document.querySelectorAll('.fade-in-up, .stagger-children');
    if (fadeEls.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        fadeEls.forEach(el => observer.observe(el));
    }

    // --- Accordion ---
    document.querySelectorAll('.accordion-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const content = btn.nextElementSibling;
            const isOpen = content.classList.contains('open');

            // Close all siblings in the same accordion group
            const parent = btn.closest('.accordion-group');
            if (parent) {
                parent.querySelectorAll('.accordion-content').forEach(c => c.classList.remove('open'));
                parent.querySelectorAll('.accordion-toggle').forEach(t => t.classList.remove('active'));
            }

            if (!isOpen) {
                content.classList.add('open');
                btn.classList.add('active');
            }
        });
    });

    // --- Smooth Scroll for Anchor Links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // --- Snipcart Cart Count Badge ---
    if (typeof Snipcart !== 'undefined') {
        document.addEventListener('snipcart.ready', () => {
            Snipcart.store.subscribe(() => {
                const count = Snipcart.store.getState().cart.items.count;
                const badge = document.getElementById('cart-count');
                if (badge) {
                    badge.textContent = count;
                    badge.style.display = count > 0 ? 'flex' : 'none';
                }
            });
        });
    }
});
