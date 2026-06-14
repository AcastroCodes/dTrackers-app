import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

import React from 'react';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        this.setState({ error, info });
        console.error("React Error Caught:", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', background: 'red', color: 'white', fontFamily: 'monospace' }}>
                    <h2>Something went wrong in React:</h2>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
                    <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>{this.state.info?.componentStack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <GlobalErrorBoundary>
                <App {...props} />
            </GlobalErrorBoundary>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
