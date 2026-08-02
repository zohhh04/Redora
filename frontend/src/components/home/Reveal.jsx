import useReveal from '../../hooks/useReveal'

export default function Reveal({ children, delay = 0, className = '', direction = 'up' }) {
  const { ref, visible } = useReveal()

  return (
    <div
      ref={ref}
      className={`reveal reveal-${direction} ${visible ? 'reveal-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
