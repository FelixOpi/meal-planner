export const Tooltip = ({ children, text }: { children: React.ReactNode, text: string }) => (
  <div className="group relative inline-block">
    {children}
    <div className="invisible group-hover:visible absolute z-50 w-48 p-2 mt-1 text-sm text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
      {text}
    </div>
  </div>
); 