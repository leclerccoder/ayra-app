"use client";

import { useEffect } from "react";

export default function AyraDomFixes() {
  useEffect(() => {
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
  }, []);

  return null;
}
