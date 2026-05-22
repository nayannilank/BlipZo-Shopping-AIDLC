import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { Outlet } from 'react-router-dom';

import { useUiStore } from './stores/ui.store';
function App() {
  const isOnline = useUiStore((state) => state.isOnline);
  return _jsxs('div', {
    className: 'min-h-screen bg-white',
    children: [
      !isOnline &&
        _jsx('div', {
          className: 'bg-yellow-500 px-4 py-2 text-center text-sm font-medium text-white',
          role: 'alert',
          'aria-live': 'polite',
          children: 'You are currently offline. Some features may be unavailable.',
        }),
      _jsx(Outlet, {}),
    ],
  });
}
export default App;
