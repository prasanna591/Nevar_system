const frameCount = 216;
const images = [];
let loadedCount = 0;

// Pad frame index to 3 digits (e.g. 001, 010, 216)
const pad = (n) => String(n).padStart(3, '0');
const getFramePath = (index) => `images/ezgif-frame-${pad(index)}.jpg`;

// State variables
let currentFrame = 1;
let targetFrame = 1;
let lastDrawnFrame = -1;
let isLoopRunning = false;

const canvas = document.getElementById('drone-canvas');
const ctx = canvas.getContext('2d');
let canvasBounds = { x: 0, y: 0, width: 0, height: 0 };

const heroPinContainer = document.querySelector('.hero-pin-container');
const heroOverlayContent = document.querySelector('.hero-overlay-content');

// Responsive resize trackers to ignore mobile address bar sways
let lastWidth = window.innerWidth;
let lastHeight = window.innerHeight;

// Preload all images in order
function preloadImages() {
    console.log(`Initializing preloader for ${frameCount} frames...`);
    for (let i = 1; i <= frameCount; i++) {
        const img = new Image();
        img.src = getFramePath(i);
        img.onload = () => {
            loadedCount++;
            // Instantly render frame 1 once loaded so user doesn't see blank screen
            if (i === 1 && currentFrame === 1) {
                drawFrame(1);
            }
            if (loadedCount === frameCount) {
                console.log(`All ${frameCount} frames preloaded successfully.`);
            }
        };
        img.onerror = () => {
            console.error(`Failed to load frame ${i} at path: ${img.src}`);
        };
        images.push(img);
    }
}

// Draw a frame to canvas (with cover scaling & redundant draw prevention)
function drawFrame(frameIndex) {
    const roundedFrame = Math.round(frameIndex);
    
    // Performance Optimization: Skip drawing if frame is unchanged
    if (roundedFrame === lastDrawnFrame) return;
    
    const imgIndex = Math.max(0, Math.min(frameCount - 1, roundedFrame - 1));
    const img = images[imgIndex];
    
    if (img && img.complete) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, canvasBounds.x, canvasBounds.y, canvasBounds.width, canvasBounds.height);
        lastDrawnFrame = roundedFrame;
    }
}

// Calculate cover bounds for drawing (supports mobile portrait & landscape)
function resizeCanvas() {
    // Only resize if canvas exists on page
    if (!canvas) return;

    const imageWidth = 1280;
    const imageHeight = 720;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Cover scale factor
    const scale = Math.max(windowWidth / imageWidth, windowHeight / imageHeight);
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = windowWidth * dpr;
    canvas.height = windowHeight * dpr;
    canvas.style.width = `${windowWidth}px`;
    canvas.style.height = `${windowHeight}px`;
    
    ctx.scale(dpr, dpr);
    
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;
    const x = (windowWidth - drawWidth) / 2;
    const y = (windowHeight - drawHeight) / 2;
    
    canvasBounds = { x, y, width: drawWidth, height: drawHeight };
    
    // Force redraw of current position on resize
    lastDrawnFrame = -1; 
    drawFrame(currentFrame);
}

// Handle resize events with mobile address bar sway filtering
window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    
    // Only resize canvas if width changes or height changes significantly (avoids address bar toggles)
    if (newWidth !== lastWidth || Math.abs(newHeight - lastHeight) > 120) {
        lastWidth = newWidth;
        lastHeight = newHeight;
        resizeCanvas();
    }
});

// Handle scroll events (tracks pin position inside hero container)
window.addEventListener('scroll', () => {
    const homePage = document.getElementById('page-home');
    if (!homePage || !homePage.classList.contains('active')) return; // Stop track if not on Homepage
    
    const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    
    // Calculate scroll bounds relative to hero track height
    const pinTop = heroPinContainer.offsetTop;
    const pinHeight = heroPinContainer.offsetHeight - window.innerHeight;
    
    const scrollFraction = pinHeight > 0 ? Math.max(0, Math.min(1, (scrollTop - pinTop) / pinHeight)) : 0;
    
    targetFrame = 1 + scrollFraction * (frameCount - 1);
    
    // Animate Hero text overlays (fade out and slide up)
    if (heroOverlayContent) {
        const fadePercent = Math.max(0, 1 - (scrollFraction * 3.5)); // Fades in the first 28% of scroll
        const slideY = -(scrollFraction * 80); // Slides up by 80px
        
        heroOverlayContent.style.opacity = fadePercent;
        heroOverlayContent.style.transform = `translateY(${slideY}px)`;
        
        // Disable click/tap interactions when hidden
        if (fadePercent <= 0.01) {
            heroOverlayContent.style.pointerEvents = 'none';
        } else {
            heroOverlayContent.style.pointerEvents = 'auto';
        }
    }

    const aboutSection = document.getElementById('about');
    if (aboutSection) {
        const revealStart = 0.2;
        const revealEnd = 0.42;
        const sectionOpacity = Math.max(0, Math.min(1, (scrollFraction - revealStart) / (revealEnd - revealStart)));
        aboutSection.style.opacity = sectionOpacity;
        aboutSection.style.transform = `translateY(${Math.max(0, 40 - sectionOpacity * 40)}px)`;
    }
    
    // Wake up animation loop on scroll
    startRenderLoop();
});

// Wakes up the loop if it has gone idle
function startRenderLoop() {
    if (!isLoopRunning) {
        isLoopRunning = true;
        requestAnimationFrame(renderLoop);
    }
}

// Lerped animation loop (with idle-state sleeping to save battery)
function renderLoop() {
    const diff = targetFrame - currentFrame;
    
    if (Math.abs(diff) < 0.005) {
        currentFrame = targetFrame;
        drawFrame(currentFrame);
        isLoopRunning = false; // Put animation loop to sleep when idle
        return;
    }
    
    // Smooth frame interpolation (coeff: 0.1)
    currentFrame += diff * 0.1;
    drawFrame(currentFrame);
    
    requestAnimationFrame(renderLoop);
}

// Single Page Application (SPA) Tab Switcher Navigation
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link, .brand');
    const pageSections = document.querySelectorAll('.page-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute('data-page');
            
            // Update nav active styling
            navLinks.forEach(l => l.classList.remove('active'));
            // If the element clicked is a link, mark active (brand logo link has no active outline)
            if (link.classList.contains('nav-link')) {
                link.classList.add('active');
            } else {
                // If brand logo clicked, set Home active
                const homeLink = document.querySelector('.nav-link[data-page="home"]');
                if (homeLink) homeLink.classList.add('active');
            }
            
            // Switch active page sections
            pageSections.forEach(section => {
                if (section.id === `page-${targetPage}`) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });
            
            // Force reset scroll on switch
            window.scrollTo({ top: 0, behavior: 'instant' });
            
            // Redraw/Resize layout
            resizeCanvas();
        });
    });
}

// Initialize
preloadImages();
resizeCanvas();
startRenderLoop();
setupNavigation();
