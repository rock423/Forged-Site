/* ============================================
   FORGED - Drops Page Countdown Timer
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // --- Countdown Timer ---
    // Set drop date to 14 days from now for demo purposes
    // Replace with a real date when launching: new Date('2026-03-15T12:00:00')
    const dropDate = new Date();
    dropDate.setDate(dropDate.getDate() + 14);
    dropDate.setHours(12, 0, 0, 0);

    const els = {
        days: document.getElementById('countdown-days'),
        hours: document.getElementById('countdown-hours'),
        mins: document.getElementById('countdown-mins'),
        secs: document.getElementById('countdown-secs'),
    };

    // Only run if countdown elements exist on the page
    if (!els.days) return;

    function updateCountdown() {
        const now = new Date();
        const diff = dropDate - now;

        if (diff <= 0) {
            // Drop is live
            els.days.textContent = '00';
            els.hours.textContent = '00';
            els.mins.textContent = '00';
            els.secs.textContent = '00';

            // Show "DROP LIVE" message if container exists
            const liveMsg = document.getElementById('drop-live-msg');
            if (liveMsg) {
                liveMsg.classList.remove('hidden');
            }

            // Hide the "coming soon" elements
            const comingSoon = document.getElementById('drop-coming-soon');
            if (comingSoon) {
                comingSoon.classList.add('hidden');
            }

            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        els.days.textContent = String(days).padStart(2, '0');
        els.hours.textContent = String(hours).padStart(2, '0');
        els.mins.textContent = String(mins).padStart(2, '0');
        els.secs.textContent = String(secs).padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);

    // --- Stock Indicator Animation ---
    const stockBar = document.getElementById('stock-bar');
    if (stockBar) {
        const stockPercent = stockBar.getAttribute('data-stock-percent') || '80';
        // Animate the stock bar on load
        setTimeout(() => {
            stockBar.style.width = stockPercent + '%';
        }, 500);
    }
});
