import { app, shell } from 'electron';
import { createTray } from './tray';
import { startServer } from './server'

const port = 2575;

app.whenReady().then(async () => {
	await startServer(port);
	createTray(port);
	shell.openExternal(`http://localhost:${port}`);
});

// The default is to quit. We subscribe to window-all-closed to override that,
// wherein we *don't* quit, so it stays active in the tray.
app.on('window-all-closed', () => {})
// See tray.ts/createTray for how we handle quitting.