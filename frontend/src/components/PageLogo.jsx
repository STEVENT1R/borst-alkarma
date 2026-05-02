const PageLogo = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none -z-10">
      <img
        src="/logo_no_bg.png"
        alt="شعار المحل"
        className="w-72 h-72 object-contain opacity-60"
      />
    </div>
  );
};

export default PageLogo;
