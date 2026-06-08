"use client";

import { useEffect } from "react";
import { ENQUIRY_PHONE_MAX_DIGITS, normalizePhoneNumberInput } from "@/lib/formValidation";

export default function AyraDomFixes() {
  useEffect(() => {
    const cleanupFns: Array<() => void> = [];

    const cover = document.querySelector(".fotorama-branded");
    if (cover) {
      const firstAnchor = cover.querySelector<HTMLAnchorElement>("a[href]");
      const src = firstAnchor?.getAttribute("href");
      if (src) {
        cover.innerHTML = "";
        const img = document.createElement("img");
        img.src = src;
        img.alt = "Ayra Design cover";
        img.style.width = "100%";
        img.style.display = "block";
        cover.appendChild(img);
      }
    }

    const featured = document.querySelector(".fotorama-branded-project-spotlight");
    if (featured) {
      const firstSlide = featured.querySelector<HTMLDivElement>("div[data-img]");
      const imgSrc = firstSlide?.getAttribute("data-img");
      const linkHref =
        firstSlide?.querySelector<HTMLAnchorElement>("a[href]")?.getAttribute("href") ??
        "/#projects";
      if (imgSrc) {
        featured.innerHTML = "";
        const anchor = document.createElement("a");
        anchor.href = linkHref;
        const img = document.createElement("img");
        img.src = imgSrc;
        img.alt = "Featured project";
        img.style.width = "100%";
        img.style.display = "block";
        anchor.appendChild(img);
        featured.appendChild(anchor);
      }
    }

    const mobileNavButton = document.querySelector<HTMLElement>(".nav-icon");
    const navigation = document.querySelector<HTMLElement>(".custom-domain-navigation");
    const pageShell = document.querySelector<HTMLElement>(".views-custom-domain");

    if (mobileNavButton && navigation) {
      const setMobileNavOpen = (isOpen: boolean) => {
        mobileNavButton.classList.toggle("open", isOpen);
        navigation.classList.toggle("active", isOpen);
        pageShell?.classList.toggle("overlay-lb-open", isOpen);
        mobileNavButton.setAttribute("aria-expanded", String(isOpen));
      };

      mobileNavButton.setAttribute("role", "button");
      mobileNavButton.setAttribute("tabindex", "0");
      mobileNavButton.setAttribute("aria-label", "Toggle navigation menu");
      mobileNavButton.setAttribute("aria-controls", "ayra-mobile-navigation");
      mobileNavButton.setAttribute("aria-expanded", "false");
      navigation.id = navigation.id || "ayra-mobile-navigation";

      const toggleMobileNav = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        setMobileNavOpen(!navigation.classList.contains("active"));
      };

      const handleToggleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          toggleMobileNav(event);
        }
        if (event.key === "Escape") {
          setMobileNavOpen(false);
        }
      };

      const closeMobileNav = () => setMobileNavOpen(false);

      const handleDocumentClick = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (mobileNavButton.contains(target) || navigation.contains(target)) return;
        setMobileNavOpen(false);
      };

      mobileNavButton.addEventListener("click", toggleMobileNav);
      mobileNavButton.addEventListener("keydown", handleToggleKeyDown);
      document.addEventListener("click", handleDocumentClick);

      cleanupFns.push(() => {
        mobileNavButton.removeEventListener("click", toggleMobileNav);
        mobileNavButton.removeEventListener("keydown", handleToggleKeyDown);
        document.removeEventListener("click", handleDocumentClick);
      });

      navigation
        .querySelectorAll<HTMLAnchorElement>("a[href]")
        .forEach((link) => {
          link.addEventListener("click", closeMobileNav);
          cleanupFns.push(() => link.removeEventListener("click", closeMobileNav));
        });
    }

    const leadForm = document.querySelector<HTMLFormElement>("#atap-lead-form");
    if (!leadForm) {
      return () => {
        cleanupFns.forEach((cleanup) => cleanup());
      };
    }

    const sections = Array.from(
      leadForm.querySelectorAll<HTMLElement>(".section-container > section")
    );

    const getSectionFields = (section: HTMLElement) =>
      Array.from(
        section.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
          "input[required], select[required], textarea[required]"
        )
      ).filter((field) => !field.disabled);

    const validateSection = (section: HTMLElement, report: boolean) => {
      const fields = getSectionFields(section);
      for (const field of fields) {
        field.setCustomValidity("");
        if (!field.checkValidity()) {
          if (report) {
            field.focus();
            field.reportValidity();
          }
          return false;
        }
      }
      return true;
    };

    const setButtonEnabled = (button: HTMLElement, enabled: boolean) => {
      button.setAttribute("aria-disabled", enabled ? "false" : "true");
      button.tabIndex = enabled ? 0 : -1;
      button.style.opacity = enabled ? "1" : "0.55";
      button.style.pointerEvents = enabled ? "auto" : "none";
    };

    const updateStepButtons = () => {
      sections.forEach((section) => {
        const nextButton = section.querySelector<HTMLElement>(".btn-show-next");
        if (!nextButton) return;
        setButtonEnabled(nextButton, validateSection(section, false));
      });
    };

    const phoneInput = leadForm.querySelector<HTMLInputElement>("#tel");
    if (phoneInput) {
      phoneInput.maxLength = ENQUIRY_PHONE_MAX_DIGITS;
      phoneInput.minLength = 7;
      phoneInput.pattern = "^[0-9]{7,11}$";
      phoneInput.placeholder = "12345678901";
      phoneInput.setAttribute(
        "data-error",
        "Phone number must contain digits only and be 7 to 11 digits long."
      );

      const handlePhoneInput = () => {
        phoneInput.value = normalizePhoneNumberInput(phoneInput.value);
        updateStepButtons();
      };

      phoneInput.addEventListener("input", handlePhoneInput);
      cleanupFns.push(() => phoneInput.removeEventListener("input", handlePhoneInput));
    }

    const watchFields = Array.from(
      leadForm.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input, select, textarea"
      )
    );

    watchFields.forEach((field) => {
      const syncValidationState = () => updateStepButtons();
      field.addEventListener("input", syncValidationState);
      field.addEventListener("change", syncValidationState);
      cleanupFns.push(() => field.removeEventListener("input", syncValidationState));
      cleanupFns.push(() => field.removeEventListener("change", syncValidationState));
    });

    const nextButtons = Array.from(
      leadForm.querySelectorAll<HTMLElement>(".btn-show-next")
    );
    nextButtons.forEach((button) => {
      const handleNextClick = (event: Event) => {
        const section = button.closest("section");
        if (!(section instanceof HTMLElement)) return;
        if (!validateSection(section, true)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        requestAnimationFrame(updateStepButtons);
      };

      button.addEventListener("click", handleNextClick, true);
      cleanupFns.push(() =>
        button.removeEventListener("click", handleNextClick, true)
      );
    });

    const prevButtons = Array.from(
      leadForm.querySelectorAll<HTMLElement>(".btn-show-prev")
    );
    prevButtons.forEach((button) => {
      const handlePrevClick = () => requestAnimationFrame(updateStepButtons);
      button.addEventListener("click", handlePrevClick, true);
      cleanupFns.push(() =>
        button.removeEventListener("click", handlePrevClick, true)
      );
    });

    const observer = new MutationObserver(() => {
      requestAnimationFrame(updateStepButtons);
    });
    observer.observe(leadForm, {
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    cleanupFns.push(() => observer.disconnect());

    updateStepButtons();

    return () => {
      cleanupFns.forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
}
