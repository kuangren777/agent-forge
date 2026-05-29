import { AppProvider } from './lib/appContext';
import { Shell } from './components/Shell';

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
