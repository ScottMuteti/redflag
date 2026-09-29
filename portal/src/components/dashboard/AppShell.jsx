/* eslint-disable react/prop-types -- layout wrapper */

// Rounded canvas: top bar across, optional floating sidebar on the left, page content beside it.
function AppShell({ topBar, sidebar, children }) {
  return (
    <div className="d-page">
      <div className={`d-canvas${sidebar ? '' : ' d-canvas-solo'}`}>
        {topBar}
        {sidebar}
        <main className="d-main">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
