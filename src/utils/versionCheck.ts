
export const APP_VERSION = '1.2.1'; // Increment this whenever you deploy a major change

export const checkVersion = () => {
    try {
        const storedVersion = localStorage.getItem('app_version');

        if (storedVersion !== APP_VERSION) {
            console.log(`Version mismatch: stored ${storedVersion} vs current ${APP_VERSION}. Clearing cache...`);
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (const registration of registrations) {
                        registration.unregister();
                        console.log('Service Worker unregistered');
                    }
                });
            }
            if ('caches' in window) {
                caches.keys().then(names => {
                    for (const name of names) {
                        caches.delete(name);
                        console.log(`Cache deleted: ${name}`);
                    }
                });
            }
            localStorage.setItem('app_version', APP_VERSION);
            setTimeout(() => {
                window.location.reload();
            }, 1000);

            return true; // Indicating an update is happening
        }
    } catch (error) {
        console.error('Version check failed', error);
    }
    return false;
};
