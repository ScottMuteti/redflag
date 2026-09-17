import { Routes, Route } from 'react-router-dom';
import AdminApp from '../portals/admin/AdminApp';
import EmployeeApp from '../portals/employee/EmployeeApp';

// TODO: gate routes by authenticated role (admin vs employee)
function AppRouter() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/portal/*" element={<EmployeeApp />} />
    </Routes>
  );
}

export default AppRouter;
