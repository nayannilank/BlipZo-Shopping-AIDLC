import { Outlet } from 'react-router-dom';

import { Header } from './components/ui/Header';
import { useUiStore } from './stores/ui.store';

function App(): React.ReactElement {
  const isOnline = useUiStore((state) => state.isOnline);

  return (
    <div className="min-h-screen bg-white">
      {!isOnline && (
        <div
          className="bg-yellow-500 px-4 py-2 text-center text-sm font-medium text-white"
          role="alert"
          aria-live="polite"
        >
          You are currently offline. Some features may be unavailable.
        </div>
      )}
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
