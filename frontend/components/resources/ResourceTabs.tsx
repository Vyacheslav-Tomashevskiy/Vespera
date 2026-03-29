export default function ResourceTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (val: string) => void;
}) {
  const tabs = [
    { id: 'tenant', label: 'Tenants' },
    { id: 'landlord', label: 'Landlords' },
    { id: 'agent', label: 'Agents' },
  ];

  return (
    <div className="flex justify-center border-b border-white/10 mb-8">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${active === tab.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
