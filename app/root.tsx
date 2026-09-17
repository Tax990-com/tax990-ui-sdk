import { useState, useEffect } from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import { HeroUIProvider } from '@heroui/react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { store, persistor } from './redux/store';
import './app.css';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/vite.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Tax990 SDK Explorer</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <Meta />
        <Links />
      </head>
      <body className="light text-foreground bg-background antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const content = <Outlet />;

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {mounted ? <HeroUIProvider>{content}</HeroUIProvider> : content}
      </PersistGate>
    </Provider>
  );
}
