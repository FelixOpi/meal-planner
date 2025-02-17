export const Navigation = () => (
  <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 md:relative md:border-none">
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex justify-around md:justify-end space-x-6 py-3">
        <NavLink href="/planner">Planer</NavLink>
        <NavLink href="/pantry">Vorrat</NavLink>
        <NavLink href="/shopping-list">Einkaufsliste</NavLink>
        <NavLink href="/favorites">Favoriten</NavLink>
      </div>
    </div>
  </nav>
); 