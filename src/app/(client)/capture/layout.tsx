export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#090B0E] text-[#F3F6FA]">
      {children}
    </div>
  );
}