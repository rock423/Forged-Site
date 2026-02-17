/* ============================================
   FORGED - Headband Customizer
   Canvas rendering, pattern engine, live preview
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM References ---
    const canvas = document.getElementById('headband-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const baseColorInput   = document.getElementById('base-color');
    const colorSwatches    = document.querySelectorAll('.color-swatch');
    const patternBtns      = document.querySelectorAll('.pattern-btn');
    const customTextInput  = document.getElementById('custom-text');
    const fontSelect       = document.getElementById('font-select');
    const textColorInput   = document.getElementById('text-color');
    const addToCartBtn     = document.getElementById('add-custom-to-cart');

    // --- State ---
    const state = {
        baseColor:  baseColorInput ? baseColorInput.value : '#1a1a1a',
        pattern:    'solid',
        text:       '',
        font:       'block',
        textColor:  textColorInput ? textColorInput.value : '#ffffff'
    };

    // --- Constants ---
    const CANVAS_W = 600;
    const CANVAS_H = 300;
    const BAND_W   = 500;
    const BAND_H   = 120;
    const BAND_X   = (CANVAS_W - BAND_W) / 2;   // 50
    const BAND_Y   = (CANVAS_H - BAND_H) / 2;   // 90
    const BAND_R   = 30;  // corner radius

    const FONT_MAP = {
        block:    '"Impact", sans-serif',
        script:   'cursive',
        military: '"Courier New", monospace',
        clean:    '"Space Grotesk", sans-serif'
    };

    // Pre-generate a static noise texture once for the fabric effect
    let fabricTexture = null;
    const buildFabricTexture = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width  = BAND_W;
        offscreen.height = BAND_H;
        const octx = offscreen.getContext('2d');
        const imageData = octx.createImageData(BAND_W, BAND_H);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const v = Math.random() * 255;
            data[i]     = v;   // R
            data[i + 1] = v;   // G
            data[i + 2] = v;   // B
            data[i + 3] = 12;  // Very low alpha for subtlety
        }
        octx.putImageData(imageData, 0, 0);
        fabricTexture = offscreen;
    };
    buildFabricTexture();


    // =========================================
    //  Utility Helpers
    // =========================================

    /** Simple deterministic hash for a string (used for cart item IDs). */
    const hashString = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32-bit int
        }
        return Math.abs(hash).toString(36);
    };

    /** Hex to {r,g,b} */
    const hexToRgb = (hex) => {
        const n = parseInt(hex.replace('#', ''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };

    /** Shift a hex color lighter or darker by a percentage (-1 to 1). */
    const shiftColor = (hex, amount) => {
        const { r, g, b } = hexToRgb(hex);
        const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
        const shift = (v) => amount > 0
            ? clamp(v + (255 - v) * amount)
            : clamp(v + v * amount);
        return `rgb(${shift(r)}, ${shift(g)}, ${shift(b)})`;
    };

    /** Seeded PRNG so patterns look stable between renders. */
    const seededRandom = (() => {
        let seed = 42;
        return {
            reset(s = 42) { seed = s; },
            next() {
                seed = (seed * 16807 + 0) % 2147483647;
                return (seed - 1) / 2147483646;
            }
        };
    })();


    // =========================================
    //  Headband Shape Path
    // =========================================

    /** Draws the headband shape as a path (rounded rect with a slight arc/curve). */
    const headbandPath = () => {
        ctx.beginPath();

        // Slight vertical curve offsets to give a natural fabric drape
        const curveDepth = 6;

        // Top-left corner
        ctx.moveTo(BAND_X + BAND_R, BAND_Y + curveDepth);

        // Top edge (slight upward arc)
        ctx.quadraticCurveTo(BAND_X + BAND_W / 2, BAND_Y - curveDepth,
                             BAND_X + BAND_W - BAND_R, BAND_Y + curveDepth);

        // Top-right corner
        ctx.arcTo(BAND_X + BAND_W, BAND_Y + curveDepth,
                  BAND_X + BAND_W, BAND_Y + BAND_R + curveDepth,
                  BAND_R);

        // Right edge
        ctx.lineTo(BAND_X + BAND_W, BAND_Y + BAND_H - BAND_R - curveDepth);

        // Bottom-right corner
        ctx.arcTo(BAND_X + BAND_W, BAND_Y + BAND_H - curveDepth,
                  BAND_X + BAND_W - BAND_R, BAND_Y + BAND_H - curveDepth,
                  BAND_R);

        // Bottom edge (slight downward arc)
        ctx.quadraticCurveTo(BAND_X + BAND_W / 2, BAND_Y + BAND_H + curveDepth,
                             BAND_X + BAND_R, BAND_Y + BAND_H - curveDepth);

        // Bottom-left corner
        ctx.arcTo(BAND_X, BAND_Y + BAND_H - curveDepth,
                  BAND_X, BAND_Y + BAND_H - BAND_R - curveDepth,
                  BAND_R);

        // Left edge
        ctx.lineTo(BAND_X, BAND_Y + BAND_R + curveDepth);

        // Top-left corner
        ctx.arcTo(BAND_X, BAND_Y + curveDepth,
                  BAND_X + BAND_R, BAND_Y + curveDepth,
                  BAND_R);

        ctx.closePath();
    };

    /** Clip all subsequent drawing to the headband shape. */
    const clipToHeadband = () => {
        headbandPath();
        ctx.clip();
    };


    // =========================================
    //  Pattern Renderers
    // =========================================

    const patterns = {

        solid() {
            // Already filled by the base color; nothing extra needed.
        },

        camo() {
            seededRandom.reset(7);
            const shades = [
                shiftColor(state.baseColor, -0.35),   // darker
                shiftColor(state.baseColor, 0.2),      // lighter
                'rgba(56, 79, 42, 0.55)',               // olive green overlay
                'rgba(101, 67, 33, 0.40)'               // brown overlay
            ];

            for (let i = 0; i < 28; i++) {
                const shade = shades[Math.floor(seededRandom.next() * shades.length)];
                const cx = BAND_X + seededRandom.next() * BAND_W;
                const cy = BAND_Y + seededRandom.next() * BAND_H;
                const rw = 30 + seededRandom.next() * 60;
                const rh = 15 + seededRandom.next() * 35;
                const angle = seededRandom.next() * Math.PI;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(angle);
                ctx.beginPath();

                // Irregular blob using a warped ellipse
                const points = 8;
                for (let p = 0; p <= points; p++) {
                    const a = (p / points) * Math.PI * 2;
                    const wobble = 0.7 + seededRandom.next() * 0.6;
                    const px = Math.cos(a) * rw * wobble;
                    const py = Math.sin(a) * rh * wobble;
                    if (p === 0) {
                        ctx.moveTo(px, py);
                    } else {
                        // Use quadratic curves for smoother blobs
                        const prevA = ((p - 0.5) / points) * Math.PI * 2;
                        const cpWobble = 0.7 + seededRandom.next() * 0.6;
                        const cpx = Math.cos(prevA) * rw * cpWobble * 1.1;
                        const cpy = Math.sin(prevA) * rh * cpWobble * 1.1;
                        ctx.quadraticCurveTo(cpx, cpy, px, py);
                    }
                }

                ctx.closePath();
                ctx.fillStyle = shade;
                ctx.fill();
                ctx.restore();
            }
        },

        splatter() {
            seededRandom.reset(13);
            const colors = [
                'rgba(255, 255, 255, 0.7)',
                'rgba(255, 255, 255, 0.45)',
                shiftColor(state.baseColor, 0.5),
                'rgba(200, 200, 200, 0.5)'
            ];

            // Main splatter dots
            for (let i = 0; i < 50; i++) {
                const color = colors[Math.floor(seededRandom.next() * colors.length)];
                const cx = BAND_X + 20 + seededRandom.next() * (BAND_W - 40);
                const cy = BAND_Y + 15 + seededRandom.next() * (BAND_H - 30);
                const r  = 2 + seededRandom.next() * 10;

                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();

                // Small satellite droplets around larger splatters
                if (r > 5) {
                    const droplets = 2 + Math.floor(seededRandom.next() * 5);
                    for (let d = 0; d < droplets; d++) {
                        const angle  = seededRandom.next() * Math.PI * 2;
                        const dist   = r + 3 + seededRandom.next() * 12;
                        const dr     = 1 + seededRandom.next() * 3;
                        const dx = cx + Math.cos(angle) * dist;
                        const dy = cy + Math.sin(angle) * dist;

                        ctx.beginPath();
                        ctx.arc(dx, dy, dr, 0, Math.PI * 2);
                        ctx.fillStyle = color;
                        ctx.fill();
                    }
                }
            }
        },

        gradient() {
            const grad = ctx.createLinearGradient(BAND_X, BAND_Y,
                                                   BAND_X + BAND_W, BAND_Y + BAND_H);
            grad.addColorStop(0,    state.baseColor);
            grad.addColorStop(0.5,  shiftColor(state.baseColor, 0.2));
            grad.addColorStop(1,    shiftColor(state.baseColor, -0.3));

            ctx.fillStyle = grad;
            ctx.fillRect(BAND_X, BAND_Y, BAND_W, BAND_H);
        },

        stripes() {
            const stripeW = 18;
            const dark    = shiftColor(state.baseColor, -0.3);
            const angle   = Math.PI / 6; // 30-degree diagonal

            ctx.save();
            // Rotate around the center of the headband
            const cx = BAND_X + BAND_W / 2;
            const cy = BAND_Y + BAND_H / 2;
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.translate(-cx, -cy);

            // Draw enough stripes to cover the rotated area
            const span = BAND_W + BAND_H + 200; // generous overshoot
            const startX = BAND_X - 150;
            const startY = BAND_Y - 100;

            for (let x = startX; x < startX + span; x += stripeW * 2) {
                ctx.fillStyle = dark;
                ctx.fillRect(x, startY, stripeW, span);
            }

            ctx.restore();
        }
    };


    // =========================================
    //  3D Edge Effects
    // =========================================

    const drawEdgeEffects = () => {
        // Top highlight - simulates light hitting the top edge
        const topHighlight = ctx.createLinearGradient(
            BAND_X, BAND_Y, BAND_X, BAND_Y + 20
        );
        topHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
        topHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = topHighlight;
        ctx.fillRect(BAND_X, BAND_Y, BAND_W, 20);

        // Bottom shadow - depth underneath
        const bottomShadow = ctx.createLinearGradient(
            BAND_X, BAND_Y + BAND_H - 25, BAND_X, BAND_Y + BAND_H
        );
        bottomShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
        bottomShadow.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = bottomShadow;
        ctx.fillRect(BAND_X, BAND_Y + BAND_H - 25, BAND_W, 25);

        // Left edge shadow
        const leftShadow = ctx.createLinearGradient(
            BAND_X, BAND_Y, BAND_X + 15, BAND_Y
        );
        leftShadow.addColorStop(0, 'rgba(0, 0, 0, 0.12)');
        leftShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = leftShadow;
        ctx.fillRect(BAND_X, BAND_Y, 15, BAND_H);

        // Right edge shadow
        const rightShadow = ctx.createLinearGradient(
            BAND_X + BAND_W - 15, BAND_Y, BAND_X + BAND_W, BAND_Y
        );
        rightShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
        rightShadow.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
        ctx.fillStyle = rightShadow;
        ctx.fillRect(BAND_X + BAND_W - 15, BAND_Y, 15, BAND_H);

        // Subtle center highlight for a convex fabric appearance
        const centerGlow = ctx.createRadialGradient(
            BAND_X + BAND_W / 2, BAND_Y + BAND_H / 2, 10,
            BAND_X + BAND_W / 2, BAND_Y + BAND_H / 2, BAND_W / 2.2
        );
        centerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
        centerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = centerGlow;
        ctx.fillRect(BAND_X, BAND_Y, BAND_W, BAND_H);
    };


    // =========================================
    //  Custom Text Rendering
    // =========================================

    const drawCustomText = () => {
        if (!state.text) return;

        const fontFamily = FONT_MAP[state.font] || FONT_MAP.block;
        const centerX = BAND_X + BAND_W / 2;
        const centerY = BAND_Y + BAND_H / 2;

        // Scale font size down for longer text
        const maxSize = 42;
        const minSize = 22;
        const len = state.text.length;
        const fontSize = Math.max(minSize, maxSize - (len > 5 ? (len - 5) * 1.8 : 0));

        ctx.save();

        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Text shadow for legibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = state.textColor;
        ctx.fillText(state.text, centerX, centerY);

        // Secondary subtle outline for crispness
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.strokeText(state.text, centerX, centerY);

        ctx.restore();
    };


    // =========================================
    //  Drop Shadow Behind Headband
    // =========================================

    const drawDropShadow = () => {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = 'rgba(0, 0, 0, 0)'; // invisible fill, shadow still renders

        headbandPath();
        // Draw the shape with shadow only; use an opaque fill then clear it
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fill();
        ctx.restore();

        // Now clear the solid black shape, leaving just the shadow
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        headbandPath();
        ctx.fill();
        ctx.restore();
    };


    // =========================================
    //  Stitch Detail Along Edges
    // =========================================

    const drawStitching = () => {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);

        // Top stitch line (follows the curve)
        const inset = 8;
        ctx.beginPath();
        ctx.moveTo(BAND_X + BAND_R, BAND_Y + inset);
        ctx.quadraticCurveTo(BAND_X + BAND_W / 2, BAND_Y + inset - 10,
                             BAND_X + BAND_W - BAND_R, BAND_Y + inset);
        ctx.stroke();

        // Bottom stitch line
        ctx.beginPath();
        ctx.moveTo(BAND_X + BAND_R, BAND_Y + BAND_H - inset);
        ctx.quadraticCurveTo(BAND_X + BAND_W / 2, BAND_Y + BAND_H - inset + 10,
                             BAND_X + BAND_W - BAND_R, BAND_Y + BAND_H - inset);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.restore();
    };


    // =========================================
    //  Main Render Function
    // =========================================

    const renderHeadband = () => {

        // 1. Clear the full canvas
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // 2. Draw the drop shadow behind the headband
        drawDropShadow();

        // 3. Clip to headband shape and fill base color
        ctx.save();
        clipToHeadband();

        ctx.fillStyle = state.baseColor;
        ctx.fillRect(BAND_X, BAND_Y, BAND_W, BAND_H);

        // 4. Apply the selected pattern
        if (patterns[state.pattern]) {
            patterns[state.pattern]();
        }

        // 5. Fabric texture overlay
        if (fabricTexture) {
            ctx.drawImage(fabricTexture, BAND_X, BAND_Y);
        }

        // 6. 3D edge highlights and shadows
        drawEdgeEffects();

        // 7. Stitch detail
        drawStitching();

        // 8. Custom text on top
        drawCustomText();

        // End clip
        ctx.restore();

        // 9. Thin border stroke around the headband (outside clip)
        ctx.save();
        headbandPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // 10. Update Snipcart button attributes
        updateCartButton();
    };


    // =========================================
    //  Snipcart Data Sync
    // =========================================

    const updateCartButton = () => {
        if (!addToCartBtn) return;

        addToCartBtn.setAttribute('data-item-custom2-value', state.baseColor);
        addToCartBtn.setAttribute('data-item-custom3-value', state.pattern);
        addToCartBtn.setAttribute('data-item-custom4-value', state.text || '(none)');
        addToCartBtn.setAttribute('data-item-custom5-value', state.font);

        // Generate a unique item ID based on all options
        const optionString = `${state.baseColor}-${state.pattern}-${state.text}-${state.font}-${state.textColor}`;
        const uniqueHash = hashString(optionString);
        addToCartBtn.setAttribute('data-item-id', `custom-headband-${uniqueHash}`);
    };


    // =========================================
    //  Event Listeners
    // =========================================

    // --- Base Color Picker ---
    if (baseColorInput) {
        baseColorInput.addEventListener('input', () => {
            state.baseColor = baseColorInput.value;

            // Deselect any active swatch since user picked a custom color
            colorSwatches.forEach(s => s.classList.remove('ring-2', 'ring-primary', 'active'));

            renderHeadband();
        });
    }

    // --- Color Swatches ---
    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            const color = swatch.dataset.color;
            if (!color) return;

            state.baseColor = color;
            if (baseColorInput) baseColorInput.value = color;

            // Active ring styling
            colorSwatches.forEach(s => s.classList.remove('ring-2', 'ring-primary', 'active'));
            swatch.classList.add('ring-2', 'ring-primary', 'active');

            renderHeadband();
        });
    });

    // --- Pattern Buttons ---
    patternBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const pattern = btn.dataset.pattern;
            if (!pattern) return;

            state.pattern = pattern;

            // Active styling
            patternBtns.forEach(b => b.classList.remove('ring-2', 'ring-primary', 'active'));
            btn.classList.add('ring-2', 'ring-primary', 'active');

            renderHeadband();
        });
    });

    // --- Custom Text Input ---
    if (customTextInput) {
        customTextInput.addEventListener('input', () => {
            state.text = customTextInput.value.substring(0, 15);
            renderHeadband();
        });
    }

    // --- Font Selector ---
    if (fontSelect) {
        fontSelect.addEventListener('change', () => {
            state.font = fontSelect.value;
            renderHeadband();
        });
    }

    // --- Text Color Picker ---
    if (textColorInput) {
        textColorInput.addEventListener('input', () => {
            state.textColor = textColorInput.value;
            renderHeadband();
        });
    }


    // =========================================
    //  Initialize
    // =========================================

    // Set the first swatch as active if it matches the default base color
    colorSwatches.forEach(swatch => {
        if (swatch.dataset.color && swatch.dataset.color.toLowerCase() === state.baseColor.toLowerCase()) {
            swatch.classList.add('ring-2', 'ring-primary', 'active');
        }
    });

    // Set the first pattern button (solid) as active
    patternBtns.forEach(btn => {
        if (btn.dataset.pattern === state.pattern) {
            btn.classList.add('ring-2', 'ring-primary', 'active');
        }
    });

    // Sync initial text from the input if pre-filled
    if (customTextInput && customTextInput.value) {
        state.text = customTextInput.value.substring(0, 15);
    }
    if (fontSelect && fontSelect.value) {
        state.font = fontSelect.value;
    }

    // First paint
    renderHeadband();
});
