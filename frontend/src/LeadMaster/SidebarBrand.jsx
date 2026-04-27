export default function SidebarBrand() {
  return (
    <div className="px-3 pt-3 pb-2 d-flex align-items-center gap-2 border-bottom border-light border-opacity-10">
      <span className="fs-4" aria-hidden="true">
        🤖
      </span>
      <div>
        <div className="text-white fw-bold lh-1" style={{ fontSize: '1rem' }}>
          LeadMaster AI
        </div>
        <div className="text-white-50 small" style={{ fontSize: '0.7rem', opacity: 0.7 }}>
          Campanhas · Leads · WhatsApp
        </div>
      </div>
    </div>
  );
}
