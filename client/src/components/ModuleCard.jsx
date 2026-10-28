/**
 * ModuleCard.jsx — Reusable Module Card Component
 *
 * Renders a clickable card for one platform module. Used inside the
 * Student Dashboard module grid.
 *
 * Props:
 *   id          {string}   — Unique module identifier (e.g. 'academic')
 *   icon        {string}   — Emoji icon for the module
 *   name        {string}   — Display name of the module
 *   description {string}   — One-line description shown on the card
 *   color       {string}   — CSS color value for the card's top accent stripe
 *   onClick     {function} — Called when the card or Enter key is pressed
 */

import '../styles/Dashboard.css'

function ModuleCard({ id, icon, name, description, color, onClick }) {
  // Allow keyboard users to activate the card with Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') onClick()
  }

  return (
    <article
      className="module-card"
      style={{ '--card-color': color }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Open ${name}`}
      id={`module-card-${id}`}
    >
      {/* Icon */}
      <div className="module-card__icon-wrap" aria-hidden="true">
        {icon}
      </div>

      {/* Name */}
      <h3 className="module-card__name">{name}</h3>

      {/* Short description */}
      <p className="module-card__desc">{description}</p>

      {/* Card navigation arrow */}
      <div className="module-card__footer">
        <span className="module-card__arrow" aria-hidden="true">→</span>
      </div>
    </article>
  )
}

export default ModuleCard
