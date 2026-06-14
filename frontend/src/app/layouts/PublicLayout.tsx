import { Outlet } from 'react-router';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

/** Public shell: navbar + page + dark footer (PLAN §16.2). */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
