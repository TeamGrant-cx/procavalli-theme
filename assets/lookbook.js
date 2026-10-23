if (window.__grantLookbookJsLoaded) {
  // no-op
} else {
  window.__grantLookbookJsLoaded = true;

  var check_JS_load = true;

  let lookbookPopupEventsBound = false;
  let popupSwiper = null;

  function registerLookbookModal() {
    if (customElements.get('lookbook-modal') || typeof ModalDialog === 'undefined') return false;

    customElements.define(
      'lookbook-modal',
      class LookbookModal extends ModalDialog {
        constructor() {
          super();
          this.contentEl = this.querySelector('.lookbook-modal__content-info');
          this.querySelector('.lookbook-modal__close')?.addEventListener('click', (event) => {
            event.preventDefault();
            this.hide();
          });
        }

        hide(preventFocus = false) {
          cleanupLookbookModalState();
          setTimeout(() => {
            if (this.contentEl) this.contentEl.innerHTML = '';
          }, 500);

          if (preventFocus) this.openedBy = null;
          super.hide(preventFocus);
        }
      }
    );

    return true;
  }

  if (!registerLookbookModal()) {
    document.addEventListener('DOMContentLoaded', registerLookbookModal, { once: true });
  }

  function getLookbookModal() {
    return document.getElementById('LookbookModal');
  }

  function ensureLookbookModal() {
    return getLookbookModal();
  }

  function cleanupLookbookModalState() {
    const allButtons = document.querySelectorAll('.lookBook__btnShowProducts');
    allButtons.forEach((btn) => {
      btn.classList.remove('is-open');
      btn.querySelector('.show_products')?.classList.remove('hidden');
      btn.querySelector('.hide_products')?.classList.add('hidden');
    });

    if (popupSwiper && typeof popupSwiper.destroy === 'function') {
      try {
        popupSwiper.destroy(true, true);
      } catch (_) {}
    }
    popupSwiper = null;

    resetLookbookModalColumns();
  }

  function resetLookbookModalColumns() {
    const modal = getLookbookModal();
    if (!modal) return;

    modal.classList.forEach((cls) => {
      if (
        cls.startsWith('column-') ||
        cls.startsWith('md-column-') ||
        cls.startsWith('sm-column-')
      ) {
        modal.classList.remove(cls);
      }
    });
  }

  function destroyPopupSwiper() {
    if (popupSwiper && typeof popupSwiper.destroy === 'function') {
      try {
        popupSwiper.destroy(true, true);
      } catch (_) {}
    }
    popupSwiper = null;
  }

  function initPopupSwiper(container) {
    if (typeof window.Swiper === 'undefined') return;

    const modal = getLookbookModal();
    if (!modal) return;

    const swiperEl = container.querySelector('.swiper');
    if (!swiperEl) return;
    const slides = swiperEl.querySelectorAll('.swiper-slide');
    const slideCount = slides.length;

    const desktopView = Math.min(slideCount, 4);
    const tabletView = Math.min(slideCount, Math.max(2, desktopView - 1));
    const mobileView = Math.min(slideCount, Math.max(1.3, desktopView - 2));

    resetLookbookModalColumns();

    modal.classList.add(
      `column-${desktopView}`,
      `md-column-${tabletView}`,
      `sm-column-${mobileView}`
    );

    popupSwiper = new window.Swiper(swiperEl, {
      slidesPerView: desktopView,
      spaceBetween: 12,
      pagination: {
        el: container.querySelector('.swiper-pagination'),
        clickable: true,
      },
      navigation: {
        nextEl: container.querySelector('.swiper-button-next'),
        prevEl: container.querySelector('.swiper-button-prev'),
      },
      breakpoints: {
        0: { slidesPerView: mobileView },
        640: { slidesPerView: tabletView },
        1024: { slidesPerView: desktopView },
      },
    });
  }

  function buildSlidesFromItem(itemEl) {
    const cards = itemEl ? itemEl.querySelectorAll('.product-card-lookbook') : [];
    const template = document.getElementById('lookbook-popup-swiper-template');
    const wrapper = template
      ? template.content.firstElementChild.cloneNode(true)
      : (() => {
          const fallback = document.createElement('div');
          fallback.className = 'swiper-container-for-popup';
          fallback.innerHTML = `
            <div class="swiper lookbook-popup-swiper" style="--swiper-navigation-top-offset: 50%;">
              <div class="swiper-wrapper"></div>
              <div class="swiper-btns-wrap swiper-btns-wrap--inside always_show_swiper_button">
                <div class="swiper-button swiper-button-prev"></div>
                <div class="swiper-button swiper-button-next"></div>
              </div>
            </div>
          `;
          return fallback;
        })();
    const swiperWrapper = wrapper.querySelector('.swiper-wrapper');
    cards.forEach((card) => {
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      slide.appendChild(card.cloneNode(true));
      swiperWrapper.appendChild(slide);
    });
    return wrapper;
  }

  function openSingleProductModal(dot, opener) {
    const productCard = dot.querySelector('.product-card-lookbook');
    if (!productCard) return;

    const modal = ensureLookbookModal();
    if (!modal?.contentEl) return;

    destroyPopupSwiper();
    modal.contentEl.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.classList.add('lookbook-single-product');
    wrapper.appendChild(productCard.cloneNode(true));
    modal.contentEl.appendChild(wrapper);

    resetLookbookModalColumns();
    modal.classList.add('column-1', 'md-column-1', 'sm-column-1');
    modal.show(opener || dot);
  }

  function getDotTouchTargetRect(dot) {
    const dotRect = dot.getBoundingClientRect();
    const beforeStyle = getComputedStyle(dot, '::before');
    let width = parseFloat(beforeStyle.width);
    let height = parseFloat(beforeStyle.height);

    if (!width || !height) {
      const fallback = parseFloat(getComputedStyle(dot).getPropertyValue('--minimum-touch-target')) || 44;
      width = fallback;
      height = fallback;
    }

    const centerX = dotRect.left + dotRect.width / 2;
    const centerY = dotRect.top + dotRect.height / 2;

    return {
      left: centerX - width / 2,
      top: centerY - height / 2,
      right: centerX + width / 2,
      bottom: centerY + height / 2,
    };
  }

  function isClickOnDotTouchTarget(dot, event) {
    if (!dot || !event || event.clientX == null || event.clientY == null) return false;

    const rect = getDotTouchTargetRect(dot);
    const { clientX, clientY } = event;

    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  function closeAllLookbookDotTooltips() {
    document.querySelectorAll('lookbook-dot.is-active').forEach((dot) => {
      dot.classList.remove('is-active');
      dot.querySelector('.lookbook-dot__content')?.classList.remove('is-open');
    });
  }

  function loadFunction() {
    if (check_JS_load) {
      check_JS_load = false;

      initializeLookbook();
      handleViewLookbook();
      renderDotsNumber();
      handleLookBookAllItemsLayout();
    }
  }

  function eventLoad() {
    ['keydown', 'mousemove', 'touchstart'].forEach((event) => {
      document.addEventListener(event, () => {
        loadFunction();
      });
    });
  }
  eventLoad();

  function handleViewLookbook() {
    if (document.querySelector('lookbook-dot')) {
      bindLookbookDotDismiss();
    }
    if (document.querySelector('.lookbook-section-list.style-popup')) {
      lookbookViewPopup();
    }
    if (document.querySelector('.lookbook-section-list.style-on-image')) {
      lookbookViewOnImage();
    }
  }

  function bindLookbookDotDismiss() {
    if (bindLookbookDotDismiss.bound) return;
    bindLookbookDotDismiss.bound = true;

    document.addEventListener('click', (e) => {
      if (!theme.config.mqlDesktop) return;
      if (e.target.closest('lookbook-dot')) return;
      if (e.target.closest('.lookBook__btnShowProducts')) return;
      if (e.target.closest('lookbook-modal')) return;
      closeAllLookbookDotTooltips();
    });
  }

  function lookbookViewPopup() {
    if (lookbookPopupEventsBound) return;
    lookbookPopupEventsBound = true;

    function openPopupFromButton(btn) {
      const gridItem = btn.closest('li.grid__item');
      if (!gridItem) return;

      const modal = ensureLookbookModal();
      if (!modal?.contentEl) return;

      destroyPopupSwiper();
      modal.contentEl.innerHTML = '';

      const slidesContainer = buildSlidesFromItem(gridItem);
      modal.contentEl.appendChild(slidesContainer);
      initPopupSwiper(slidesContainer);

      const trigger = btn.closest('.lookBook__btnShowProducts');
      trigger?.classList.add('is-open');
      modal.show(trigger || btn);
    }

    document.addEventListener('click', function (e) {
      const clickedButton = e.target.closest(
        '.lookbook-section-list.style-popup .lookBook__btnShowProducts'
      );
      const allButtons = document.querySelectorAll(
        '.lookbook-section-list.style-popup .lookBook__btnShowProducts'
      );
      const modal = getLookbookModal();

      if (!clickedButton && !e.target.closest('lookbook-modal') && !e.target.closest('lookbook-dot')) {
        if (!modal?.hasAttribute('open')) return;
        modal.hide(true);
        return;
      }

      if (clickedButton) {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = clickedButton.classList.contains('is-open');
        const showText = clickedButton.querySelector('.show_products');
        const hideText = clickedButton.querySelector('.hide_products');

        resetLookbookModalColumns();

        allButtons.forEach((btn) => {
          if (btn !== clickedButton) {
            btn.classList.remove('is-open');
            btn.querySelector('.show_products')?.classList.remove('hidden');
            btn.querySelector('.hide_products')?.classList.add('hidden');
          }
        });

        if (isOpen) {
          clickedButton.classList.remove('is-open');
          showText?.classList.remove('hidden');
          hideText?.classList.add('hidden');
          modal?.hide(true);
        } else {
          clickedButton.classList.add('is-open');
          showText?.classList.add('hidden');
          hideText?.classList.remove('hidden');
          openPopupFromButton(clickedButton);
        }
      }
    });
  }

  function lookbookViewOnImage() {
    const popupTemplate = `
      <div class="lookBook__imgPopup">
        <a href="#" class="close lookbook-close">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
        <div class="lookBook__imgPopup-wrapper h-full overflow-y-a cus-scrollbar"></div>
      </div>
    `;

    const lookBookItems = document.querySelectorAll('.lookbook-section-list.style-on-image .lookbook-item');

    lookBookItems.forEach((item) => {
      if (!item.querySelector('.lookBook__imgPopup')) {
        item.insertAdjacentHTML('beforeend', popupTemplate);
      }

      const button = item.querySelector('.lookBook__btnShowProducts');
      const popupEl = item.querySelector('.lookBook__imgPopup');
      if (!popupEl) return;

      const wrapper = popupEl.querySelector('.lookBook__imgPopup-wrapper');
      const closeBtn = popupEl.querySelector('.close');
      if (!wrapper || !closeBtn) return;

      const showText = button?.querySelector('.show_products');
      const hideText = button?.querySelector('.hide_products');

      function getCards() {
        return Array.from(item.querySelectorAll('.product-card-lookbook'))
          .filter((el) => !el.closest('.lookBook__imgPopup'))
          .map((el) => el.cloneNode(true));
      }

      button?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = button.classList.contains('is-open');

        if (isOpen) {
          button.classList.remove('is-open');
          showText.classList.remove('hidden');
          hideText.classList.add('hidden');
          popupEl.classList.remove('is-open');
          wrapper.innerHTML = '';
        } else {
          button.classList.add('is-open');
          showText.classList.add('hidden');
          hideText.classList.remove('hidden');
          wrapper.innerHTML = '';
          getCards().forEach((card) => wrapper.appendChild(card));
          popupEl.classList.add('is-open');
        }
      });

      closeBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        popupEl.classList.remove('is-open');
        button.classList.remove('is-open');
        showText.classList.remove('hidden');
        hideText.classList.add('hidden');
        wrapper.innerHTML = '';
      });
    });
  }

  function renderDotsNumber() {
    const dotNumberSections = document.querySelectorAll('.dots-style-number');

    dotNumberSections.forEach(function(section) {
      const dots = section.querySelectorAll('.lookbook-dot');

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        const icon = dot.querySelector('.lookbook-dot__icon');
        dot.classList.add('dot-number');

        if (!icon || icon.querySelector('.lookbook-dot__number')) continue;

        const plusWrapper = icon.querySelector('.icon-plus-wrapper');
        const numberEl = document.createElement('span');
        numberEl.className = 'lookbook-dot__number';
        numberEl.textContent = String(i + 1);

        if (plusWrapper) {
          plusWrapper.replaceWith(numberEl);
        } else {
          icon.prepend(numberEl);
        }
      }
    });
  }

  function handleLookBookAllItemsLayout() {
    const lookbookAllItemsLayout = document.querySelectorAll('.lookbook-section-list.lookbook-all-items-layout');

    if (!lookbookAllItemsLayout.length) return;

    lookbookAllItemsLayout.forEach(function(item) {
      const dots = item.querySelectorAll('lookbook-dot .lookbook-dot__content');
      const showProductsBtn = item.querySelector('.lookBook__btnShowProducts');
      const dotElements = item.querySelectorAll('lookbook-dot');
      const allItemsSwiper =
        item.querySelector('.lookbook-item-all .swiper') || item.querySelector('.swiper');

      const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          initializeActiveDot();

          setTimeout(() => {
            handleSliderChange();
          }, 200);
        }
      });
      observer.observe(item);

      if (showProductsBtn) {
        showProductsBtn.remove();
      }

      dots.forEach(function(content) {
        content.classList.add('hidden');
      });

      function getDotProductId(dot) {
        const productIdEl = dot.querySelector('[data-product-id]');
        return productIdEl ? productIdEl.getAttribute('data-product-id') : null;
      }

      function getSlideProductId(slide) {
        const productIdEl = slide.querySelector('[data-product-card-id]');
        return productIdEl ? productIdEl.getAttribute('data-product-card-id') : null;
      }

      function updateActiveDot(productId) {
        if (!productId) return;

        dotElements.forEach(function(dot) {
          const dotProductId = getDotProductId(dot);
          const dotElement = dot.closest('lookbook-dot');

          if (dotProductId == productId) {
            dotElement.classList.add('is-active');
          } else {
            dotElement.classList.remove('is-active');
          }
        });
      }

      function initializeActiveDot() {
        if (!allItemsSwiper) return;

        const activeSlide =
          allItemsSwiper.querySelector('.swiper-slide-active') ||
          allItemsSwiper.querySelector('.swiper-slide');

        if (activeSlide) {
          const activeProductId = getSlideProductId(activeSlide);
          updateActiveDot(activeProductId);
        }
      }

      function handleDotClick(dot) {
        const productId = getDotProductId(dot);
        if (!productId || !allItemsSwiper || !allItemsSwiper.swiper) return;

        const swiperInstance = allItemsSwiper.swiper;
        const slides = Array.from(allItemsSwiper.querySelectorAll('.swiper-slide'));

        const targetSlideIndex = slides.findIndex(slide => {
          const slideProductId = getSlideProductId(slide);
          return slideProductId == productId;
        });

        if (targetSlideIndex >= 0) {
          swiperInstance.slideTo(targetSlideIndex, 600);
          setTimeout(() => {
            updateActiveDot(productId);
          }, 100);
        }
      }

      function bindDotInteraction(dot) {
        if (theme.config.mqlDesktop) {
          dot.addEventListener('mouseenter', function () {
            handleDotClick(dot);
          });
        }

        dot.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          handleDotClick(dot);
        });
      }

      dotElements.forEach(bindDotInteraction);

      function handleSliderChange() {
        if (allItemsSwiper && allItemsSwiper.swiper) {
          allItemsSwiper.swiper.on('slideChangeTransitionEnd', function() {
            const activeSlide = this.el.querySelector('.swiper-slide-active');
            if (activeSlide) {
              const activeProductId = getSlideProductId(activeSlide);
              updateActiveDot(activeProductId);
            }
          });
        }
      }
    });
  }

  function initializeLookbook() {
    class LookbookDot extends HTMLElement {
      constructor() {
        super();
        this.content = this.querySelector('.lookbook-dot__content');
        this.handleClick = this.handleClick.bind(this);
        this.handleHover = this.handleHover.bind(this);
        this.handleResize = this.handleResize.bind(this);
      }

      connectedCallback() {
        if (this.closest('.lookbook-section-list.lookbook-all-items-layout')) {
          window.addEventListener('resize', this.handleResize);
          return;
        }

        if (theme.config.mqlDesktop) {
          this.addEventListener('mouseenter', this.handleHover);
          this.addEventListener('click', this.handleClick);
        } else {
          this.addEventListener('click', this.handleClick);
        }
        window.addEventListener('resize', this.handleResize);
      }

      disconnectedCallback() {
        this.removeEventListener('click', this.handleClick);
        this.removeEventListener('mouseenter', this.handleHover);
        window.removeEventListener('resize', this.handleResize);
      }

      handleResize() {
        if (this.classList.contains('is-active')) {
          this.updateContentDirection();
        }
      }

      updateContentDirection() {
        if (!this.content) return;
        if (!theme.config.mqlDesktop) return;
        if (this.closest('.lookbook-section-list.lookbook-all-items-layout')) return;

        this.content.classList.remove('position-left', 'position-bottom');
        this.content.style.left = '';
        this.content.style.right = '';
        this.content.style.top = '';
        this.content.style.bottom = '';
        this.content.style.maxWidth = '';
        this.content.style.removeProperty('--arrow-offset-x');

        const gap = 22;
        const contentWidth = this.content.offsetWidth || 0;
        const contentHeight = this.content.offsetHeight || 0;
        const dotRect = this.getBoundingClientRect();
        const boundaryEl =
          this.closest('.lookbook-item') ||
          this.closest('.lookbook-item-all') ||
          this.closest('.lookbook-item__image');
        const boundaryRect = boundaryEl
          ? boundaryEl.getBoundingClientRect()
          : { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };

        const boundaryWidth = boundaryRect.right - boundaryRect.left;
        const rightSpace = boundaryRect.right - dotRect.right;
        const leftSpace = dotRect.left - boundaryRect.left;
        const bottomSpace = boundaryRect.bottom - dotRect.bottom;

        const canOpenRight = rightSpace >= contentWidth + gap;
        const canOpenLeft = leftSpace >= contentWidth + gap;
        const canOpenBottom = bottomSpace >= contentHeight + gap;
        const isNarrowBanner = boundaryWidth < contentWidth + gap * 2;
        const useBottom = isNarrowBanner || (!canOpenRight && !canOpenLeft);

        if (!useBottom && canOpenRight) return;

        if (!useBottom && canOpenLeft) {
          this.content.classList.add('position-left');
          return;
        }

        if (useBottom) {
          this.content.classList.add('position-bottom');
          this.content.style.maxWidth = `${Math.max(160, boundaryWidth - gap * 2)}px`;
          this.positionBottomContent(boundaryRect, gap);
          return;
        }

        // Fallback: keep content inside banner horizontally.
        if (rightSpace >= leftSpace) {
          const clampedLeft = Math.max(0, boundaryRect.right - dotRect.left - contentWidth);
          this.content.style.left = `${clampedLeft}px`;
        } else {
          this.content.classList.add('position-left');
          const clampedRight = Math.max(0, dotRect.right - boundaryRect.left - contentWidth);
          this.content.style.right = `${clampedRight}px`;
        }
      }

      positionBottomContent(boundaryRect, gap) {
        const icon = this.querySelector('.lookbook-dot__icon');
        if (!icon || !this.content) return;

        const apply = () => {
          if (!this.content.classList.contains('position-bottom')) return;

          const iconRect = icon.getBoundingClientRect();
          const dotRect = this.getBoundingClientRect();
          const dotCenterX = dotRect.left + dotRect.width / 2;
          const contentWidth = this.content.offsetWidth;
          const contentLeftViewport = Math.max(
            boundaryRect.left + gap,
            Math.min(dotCenterX - contentWidth / 2, boundaryRect.right - gap - contentWidth)
          );

          this.content.style.left = `${contentLeftViewport - iconRect.left}px`;
          this.content.style.setProperty('--arrow-offset-x', `${dotCenterX - contentLeftViewport}px`);
        };

        requestAnimationFrame(() => {
          apply();
          requestAnimationFrame(apply);
        });
      }

      handleHover(e) {
        this.handleClick(e);
      }

      handleClick(e) {
        if (this.closest('.lookbook-section-list.lookbook-all-items-layout')) return;

        e?.preventDefault();
        e?.stopPropagation();

        const isDesktop = theme.config.mqlDesktop;

        // Mobile: tap dot → open modal with this product only.
        if (!isDesktop) {
          if (!isClickOnDotTouchTarget(this, e)) return;

          openSingleProductModal(this, this.querySelector('.lookbook-dot__icon') || this);
          return;
        }

        // Desktop: hover opens tooltip; click active dot toggles closed.
        const alreadyActive = this.classList.contains('is-active');

        if (alreadyActive && e?.type === 'click') {
          this.classList.remove('is-active');
          this.content?.classList.remove('is-open');
          return;
        }

        if (alreadyActive) return;

        closeAllLookbookDotTooltips();

        this.classList.add('is-active');
        this.content?.classList.add('is-open');
        this.updateContentDirection();
      }
    }
    customElements.define('lookbook-dot', LookbookDot);
  }
}