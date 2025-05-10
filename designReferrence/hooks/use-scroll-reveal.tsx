"use client"

import { useEffect } from "react"

export function useScrollReveal() {
  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal")

    const reveal = () => {
      revealElements.forEach((element) => {
        const windowHeight = window.innerHeight
        const elementTop = element.getBoundingClientRect().top
        const elementVisible = 150

        if (elementTop < windowHeight - elementVisible) {
          element.classList.add("active")
        }
      })
    }

    window.addEventListener("scroll", reveal)
    // 初期表示時にも実行
    reveal()

    return () => window.removeEventListener("scroll", reveal)
  }, [])
}
