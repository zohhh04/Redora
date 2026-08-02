import { useEffect, useRef, useState } from 'react'

export default function useReveal(options = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: options.rootMargin || '0px 0px -40px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [options.rootMargin])

  return { ref, visible }
}
