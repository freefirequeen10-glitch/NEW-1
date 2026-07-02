import { 
  db, 
  onSnapshot, 
  doc, 
  collection 
} from './firebase.js';

import { 
  setSafeSrc, 
  hideSkeleton 
} from './utils.js';

// Local slider state variables
let bannerSlides = [];
let currentSlideIndex = 0;
let slideInterval = null;
let touchStartX = 0;
let touchEndX = 0;

/**
 * Renders the sliding banner cards inside the wrapper and dots indicator panel.
 */
function renderSlider() {
  const wrapper = document.getElementById('slider-wrapper');
  const dotsContainer = document.getElementById('slider-dots');
  const emptyState = document.getElementById('slider-empty');
  const skeleton = document.getElementById('slider-skeleton');

  if (!wrapper || !dotsContainer || !emptyState) return;

  wrapper.innerHTML = '';
  dotsContainer.innerHTML = '';
  if (skeleton) skeleton.classList.add('hidden');
  emptyState.classList.add('hidden');
  clearInterval(slideInterval);

  if (bannerSlides.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  bannerSlides.forEach((slide, idx) => {
    const slideEl = document.createElement('div');
    slideEl.className = "w-full h-full flex-shrink-0 relative overflow-hidden";
    
    const img = document.createElement('img');
    img.setAttribute("src", slide.imageUrl);
    img.src = slide.imageUrl;
    img.removeAttribute("hidden");
    img.classList.remove("hidden");
    img.style.display = "block";
    img.alt = "Arena Slide";
    img.className = "w-full h-full object-cover transition-transform duration-1000 hover:scale-105 opacity-80 hover:opacity-100";
    
    slideEl.appendChild(img);
    wrapper.appendChild(slideEl);

    const dot = document.createElement('button');
    dot.className = `w-2 h-2 rounded-full transition-all duration-300 ${idx === 0 ? 'bg-[#d4af37] w-4' : 'bg-slate-600'}`;
    dot.addEventListener('click', () => {
      goToSlide(idx);
    });
    dotsContainer.appendChild(dot);
  });

  currentSlideIndex = 0;
  updateSliderPosition();
  startAutoSlide();
}

/**
 * Updates CSS translation values and sets CSS class configurations for pagination dots.
 */
function updateSliderPosition() {
  const wrapper = document.getElementById('slider-wrapper');
  if (!wrapper) return;
  wrapper.style.transform = `translateX(-${currentSlideIndex * 100}%)`;

  const dots = document.querySelectorAll('#slider-dots button');
  dots.forEach((dot, idx) => {
    if (idx === currentSlideIndex) {
      dot.className = "w-2 h-2 rounded-full transition-all duration-300 bg-[#d4af37] w-4";
    } else {
      dot.className = "w-2 h-2 rounded-full transition-all duration-300 bg-slate-600";
    }
  });
}

/**
 * Slides navigation engine controller.
 * @param {number} idx - Sliding index index target
 */
function goToSlide(idx) {
  if (idx < 0) {
    currentSlideIndex = bannerSlides.length - 1;
  } else if (idx >= bannerSlides.length) {
    currentSlideIndex = 0;
  } else {
    currentSlideIndex = idx;
  }
  updateSliderPosition();
  startAutoSlide();
}

/**
 * Triggers automated timing translation loops.
 */
function startAutoSlide() {
  clearInterval(slideInterval);
  if (bannerSlides.length > 1) {
    slideInterval = setInterval(() => {
      currentSlideIndex = (currentSlideIndex + 1) % bannerSlides.length;
      updateSliderPosition();
    }, 4000);
  }
}

/**
 * Initializes physical swipe gesture touch trackers on sliding containers.
 */
export const initSwipeListeners = () => {
  const container = document.getElementById('banner-slider-container');
  if (container && !container.dataset.swipeBound) {
    container.dataset.swipeBound = "true";
    container.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const threshold = 50;
      if (touchStartX - touchEndX > threshold) {
        goToSlide(currentSlideIndex + 1);
      } else if (touchEndX - touchStartX > threshold) {
        goToSlide(currentSlideIndex - 1);
      }
    }, { passive: true });
  }
};

/**
 * Sets up background streams for promotional category banners and sliders from sliderImages collection.
 */
export function initBannersSync() {
  onSnapshot(collection(db, "sliderImages"), (snap) => {
    bannerSlides = [];
    snap.forEach((d) => {
      const id = d.id;
      const val = d.data();
      const imageUrl = val.imageUrl;
      if (!imageUrl) return;

      // Collect all documents in sliderImages matching the slider prefix or legacy banner formats
      if (id === 'soloBanner' || id === 'duoBanner' || id === 'squadBanner' || id.startsWith('slider')) {
        bannerSlides.push({ id, imageUrl });
      }
    });

    // Ensure slider slides are sorted properly sequentially by ID
    bannerSlides.sort((a, b) => {
      return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Extract images for Solo, Duo, and Squad category banners from the existing documents
    let soloUrl = null;
    let duoUrl = null;
    let squadUrl = null;

    // 1. Try mapping explicitly by legacy ID or sequential ID from slider collection
    const soloDoc = bannerSlides.find(s => s.id === 'soloBanner' || s.id === 'slider1');
    const duoDoc = bannerSlides.find(s => s.id === 'duoBanner' || s.id === 'slider2');
    const squadDoc = bannerSlides.find(s => s.id === 'squadBanner' || s.id === 'slider3');

    if (soloDoc) soloUrl = soloDoc.imageUrl;
    if (duoDoc) duoUrl = duoDoc.imageUrl;
    if (squadDoc) squadUrl = squadDoc.imageUrl;

    // 2. Fall back to index-based allocation from the available sorted slides
    const sliderOnlySlides = bannerSlides.filter(s => s.id.startsWith('slider'));
    if (sliderOnlySlides.length > 0) {
      if (!soloUrl) soloUrl = sliderOnlySlides[0].imageUrl;
      if (!duoUrl) duoUrl = sliderOnlySlides[Math.min(1, sliderOnlySlides.length - 1)].imageUrl;
      if (!squadUrl) squadUrl = sliderOnlySlides[Math.min(2, sliderOnlySlides.length - 1)].imageUrl;
    }

    // Assign mapped image sources to target containers safely
    if (soloUrl) {
      const img = document.getElementById('banner-solo');
      if (img) {
        img.setAttribute("src", soloUrl);
        img.src = soloUrl;
        img.removeAttribute("hidden");
        img.classList.remove("hidden");
        img.style.display = "block";
      }
      hideSkeleton('banner-solo-skeleton');
    }

    if (duoUrl) {
      const img = document.getElementById('banner-duo');
      if (img) {
        img.setAttribute("src", duoUrl);
        img.src = duoUrl;
        img.removeAttribute("hidden");
        img.classList.remove("hidden");
        img.style.display = "block";
      }
      hideSkeleton('banner-duo-skeleton');
    }

    if (squadUrl) {
      const img = document.getElementById('banner-squad');
      if (img) {
        img.setAttribute("src", squadUrl);
        img.src = squadUrl;
        img.removeAttribute("hidden");
        img.classList.remove("hidden");
        img.style.display = "block";
      }
      hideSkeleton('banner-squad-skeleton');
    }

    // Set only primary slides for presentation in the home carousel
    bannerSlides = sliderOnlySlides;

    renderSlider();
  });
}